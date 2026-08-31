// GET /api/auth/google/start — begin connecting the user's Gmail account.
//
// Gmail is attached to the user's EXISTING email/password account, so a valid
// session is required first. We mint a random CSRF `state`, stash it in a
// short-lived httpOnly cookie, and redirect to Google's consent screen. The
// callback verifies that the state coming back matches the cookie.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getCurrentUser } from "@/lib/session";
import { getAuthUrl, STATE_COOKIE } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) {
    // Not signed in — send them to log in first, then they can retry connecting.
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(getAuthUrl(state));
  // sameSite:"lax" so the cookie is still sent on the top-level GET navigation
  // Google makes back to our callback. Short maxAge — the round-trip is quick.
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
