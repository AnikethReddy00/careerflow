// Session layer for classic email/password auth. The session is a JSON Web Token
// (JWT) signed with jose (HS256) and carried in an httpOnly cookie — the token
// is never exposed to client-side JavaScript, which is what makes cookie-stored
// JWTs resistant to XSS token theft.
//
// getCurrentUser() is the single source of "who is making this request" and
// REPLACES the temporary getDevUser() stand-in used before auth existed.

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export const SESSION_COOKIE = "cf_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

// The signing key, derived from JWT_SECRET. Thrown here (rather than failing
// silently) so a missing secret is obvious the first time auth is exercised.
function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set — add it to .env.local (see .env.example)."
    );
  }
  return new TextEncoder().encode(secret);
}

// Cookie attributes reused by every route that sets the session. `secure` is on
// only in production so it still works over http://localhost in development.
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

// Mint a signed token whose subject is the user's id.
export async function signSession(userId) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

// Verify a token's signature and expiry. Returns the payload, or null if the
// token is missing/tampered/expired (jwtVerify throws on any of those).
export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload;
  } catch {
    return null;
  }
}

// Read the session cookie, verify it, and load the user. Returns null when the
// request is unauthenticated. passwordHash stays excluded (select:false), so the
// returned user is safe to pass around server-side.
export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload?.sub) return null;

  await connectDB();
  const user = await User.findById(payload.sub).lean();
  return user || null;
}
