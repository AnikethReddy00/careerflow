// Minting short-lived Gmail access tokens for the agent.
//
// The user connects once; we store a long-lived refresh token (select:false).
// Access tokens expire in ~1 hour, so before each Gmail read we hand out a valid
// one: reuse the cached access token while it's still fresh, otherwise ask
// Google for a new one and persist it. This is DB-coupled (unlike oauth.js), so
// it lives in its own module that the scheduled agent loop can reuse later.

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { refreshAccessToken, GoogleOAuthError } from "@/lib/google/oauth";

// Refresh slightly early so a token can't expire mid-request.
const EXPIRY_BUFFER_MS = 60 * 1000;

// Return a valid Gmail access token for the given user id, refreshing and
// persisting a new one when the cached token is missing or about to expire.
// Throws GoogleOAuthError with code "not_connected" when Gmail was never linked,
// or "invalid_grant" when the stored refresh token has been revoked/expired —
// both mean the caller should prompt the user to reconnect.
export async function getAccessTokenForUser(userId) {
  await connectDB();

  // Re-include the secret tokens (normally select:false) for this one query.
  const user = await User.findById(userId).select(
    "+google.refreshToken +google.accessToken"
  );
  if (!user?.google?.refreshToken) {
    throw new GoogleOAuthError("Gmail is not connected for this user.", {
      code: "not_connected",
    });
  }

  const cached = user.google.accessToken;
  const expiresAt = user.google.tokenExpiresAt?.getTime() ?? 0;
  if (cached && expiresAt - EXPIRY_BUFFER_MS > Date.now()) {
    return cached;
  }

  // Cached token missing or (nearly) expired — mint a fresh one and store it.
  const { accessToken, expiresIn } = await refreshAccessToken(
    user.google.refreshToken
  );
  const tokenExpiresAt = new Date(Date.now() + (expiresIn ?? 3600) * 1000);
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        "google.accessToken": accessToken,
        "google.tokenExpiresAt": tokenExpiresAt,
      },
    }
  );

  return accessToken;
}
