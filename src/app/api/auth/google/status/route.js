// GET /api/auth/google/status — is this user's Gmail connected, and as whom?
//
// Reports from the non-secret fields (email/connectedAt). getCurrentUser()
// returns a lean user WITHOUT the select:false tokens, so the refresh token is
// never touched or exposed here.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const connected = Boolean(user.google?.connectedAt && user.google?.email);
  return NextResponse.json({
    connected,
    email: connected ? user.google.email : null,
    connectedAt: connected ? user.google.connectedAt : null,
  });
}
