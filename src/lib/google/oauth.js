// Google OAuth 2.0 helper for connecting a user's Gmail account.
//
// We use the server-side "authorization code" flow with plain fetch() — no SDK
// needed. The flow:
//   1. Redirect the user to Google's consent screen (getAuthUrl).
//   2. Google redirects back to our callback with a one-time `code`.
//   3. We exchange that code for tokens (exchangeCodeForTokens). Crucially this
//      includes a long-lived `refresh_token` — obtained because we request
//      access_type=offline + prompt=consent — which lets the agent read Gmail
//      later without the user present.
//
// Scopes: openid + email (to learn which Gmail account was connected) and
// gmail.readonly (inbox read for the agent). gmail.send gets added later, when
// the agent actually sends follow-ups.

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

// Requested scopes. Keep openid+email first so userinfo works, then Gmail read.
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.readonly",
];

// Name of the short-lived cookie that carries the CSRF `state` value between the
// start redirect and the callback. Centralized here so both routes agree.
export const STATE_COOKIE = "cf_google_oauth_state";

// Distinguishes "Google/config problem" from ordinary bad input, so callers can
// react appropriately (surface a retry vs. a config hint).
export class GoogleOAuthError extends Error {
  constructor(message, { cause, status, code } = {}) {
    super(message);
    this.name = "GoogleOAuthError";
    if (cause) this.cause = cause;
    // HTTP status from Google (when the failure came from a response) and
    // Google's machine-readable error code (e.g. "invalid_grant" for a dead
    // refresh token) — callers use `code` to decide "retry" vs. "reconnect".
    if (status !== undefined) this.status = status;
    if (code) this.code = code;
  }
}

function clientId() {
  const v = process.env.GOOGLE_CLIENT_ID;
  if (!v) {
    throw new GoogleOAuthError(
      "GOOGLE_CLIENT_ID is not set — add it to .env.local (see .env.example)."
    );
  }
  return v;
}

function clientSecret() {
  const v = process.env.GOOGLE_CLIENT_SECRET;
  if (!v) {
    throw new GoogleOAuthError(
      "GOOGLE_CLIENT_SECRET is not set — add it to .env.local (see .env.example)."
    );
  }
  return v;
}

// Must match an "Authorized redirect URI" on the OAuth client EXACTLY. Defaults
// to local dev; set GOOGLE_REDIRECT_URI to the deployed URL in production.
export function redirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3000/api/auth/google/callback"
  );
}

// Build the consent-screen URL. `state` is an opaque CSRF token we verify on the
// way back. access_type=offline + prompt=consent guarantee a refresh token.
export function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

// Exchange the one-time authorization code for tokens.
// Returns { access_token, expires_in, refresh_token, scope, token_type, id_token }.
export async function exchangeCodeForTokens(code) {
  let res;
  try {
    res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId(),
        client_secret: clientSecret(),
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
      }),
    });
  } catch (err) {
    throw new GoogleOAuthError(
      "Couldn't reach Google to exchange the code. Check your internet connection.",
      { cause: err }
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.error_description || data.error || "unknown error";
    throw new GoogleOAuthError(
      `Google token exchange failed (${res.status}): ${detail}`
    );
  }
  return data;
}

// Exchange a stored refresh token for a fresh, short-lived access token. Google
// does NOT return a new refresh token here — the original stays valid until the
// user revokes it (or, in "Testing" publishing status, expires after ~7 days,
// which surfaces as an invalid_grant error the caller can treat as "reconnect").
// Returns { accessToken, expiresIn, scope, tokenType }.
export async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new GoogleOAuthError(
      "No refresh token available — reconnect Gmail.",
      { code: "no_refresh_token" }
    );
  }

  let res;
  try {
    res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId(),
        client_secret: clientSecret(),
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
  } catch (err) {
    throw new GoogleOAuthError(
      "Couldn't reach Google to refresh access. Check your internet connection.",
      { cause: err }
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.error_description || data.error || "unknown error";
    throw new GoogleOAuthError(
      `Google token refresh failed (${res.status}): ${detail}`,
      { status: res.status, code: data.error }
    );
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    tokenType: data.token_type,
  };
}

// Look up which Google account just authorized us (for display + email matching).
export async function getUserInfo(accessToken) {
  let res;
  try {
    res = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    throw new GoogleOAuthError(
      "Couldn't reach Google to read your account info.",
      { cause: err }
    );
  }
  if (!res.ok) {
    throw new GoogleOAuthError(
      `Google userinfo request failed (${res.status}).`
    );
  }
  return res.json();
}

// Best-effort revoke on disconnect. Deliberately never throws — disconnecting
// locally should succeed even if Google is unreachable or the token is already
// invalid; we still wipe our stored copy afterwards.
export async function revokeToken(token) {
  if (!token) return;
  try {
    await fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  } catch {
    // ignore
  }
}
