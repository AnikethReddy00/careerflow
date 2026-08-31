// GET /api/auth/google/callback — Google redirects here after the consent screen.
//
// Steps: verify the CSRF state against our cookie, exchange the one-time code for
// tokens, confirm which account was connected, store the refresh token on the
// logged-in user, then bounce back to /agent with a short status flag the UI
// surfaces. The refresh token is the long-lived credential the agent will use to
// read Gmail on a schedule.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import {
  STATE_COOKIE,
  GOOGLE_SCOPES,
  exchangeCodeForTokens,
  getUserInfo,
} from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

// Redirect back to the agent page with a status the client can turn into a
// message, clearing the one-time state cookie on the way out.
function backToAgent(request, status) {
  const url = new URL("/agent", request.url);
  url.searchParams.set("gmail", status);
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // The user declined consent, or Google returned an error.
  if (searchParams.get("error")) {
    return backToAgent(request, "denied");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // CSRF: the state Google echoes back must match the cookie we set at start.
  const store = await cookies();
  const expectedState = store.get(STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return backToAgent(request, "error");
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // With prompt=consent we should always get a refresh token. If it's ever
    // missing, don't store a half-connection — tell the user how to fix it.
    if (!tokens.refresh_token) {
      return backToAgent(request, "notoken");
    }

    const info = await getUserInfo(tokens.access_token);

    await connectDB();
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          "google.email": info.email || "",
          "google.refreshToken": tokens.refresh_token,
          "google.connectedAt": new Date(),
          "google.scopes": tokens.scope
            ? tokens.scope.split(" ")
            : GOOGLE_SCOPES,
        },
      }
    );

    return backToAgent(request, "connected");
  } catch {
    return backToAgent(request, "error");
  }
}
