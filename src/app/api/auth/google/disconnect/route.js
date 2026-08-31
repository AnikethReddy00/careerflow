// POST /api/auth/google/disconnect — revoke and forget the user's Gmail link.
//
// We pull the refresh token explicitly (it's select:false), ask Google to revoke
// it (best-effort — never blocks the disconnect), then wipe every google.* field
// from the user document.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { revokeToken } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await connectDB();

  // Re-include the secret refresh token so we can revoke it at Google.
  const withToken = await User.findById(user._id).select(
    "+google.refreshToken"
  );
  await revokeToken(withToken?.google?.refreshToken);

  await User.updateOne(
    { _id: user._id },
    {
      $unset: {
        "google.email": "",
        "google.refreshToken": "",
        "google.accessToken": "",
        "google.tokenExpiresAt": "",
        "google.connectedAt": "",
        "google.scopes": "",
      },
    }
  );

  return NextResponse.json({ connected: false });
}
