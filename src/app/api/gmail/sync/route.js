// POST /api/gmail/sync — read the most recent inbox messages for the signed-in
// user and return them for display.
//
// This is the first "the agent can see your mail" slice: strictly read-only, no
// classification and no status changes yet. It proves the full path works —
// stored refresh token → fresh access token → Gmail read — before we layer the
// LLM and status updates on top.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getAccessTokenForUser } from "@/lib/google/tokens";
import { listRecentMessages, GmailError } from "@/lib/google/gmail";
import { classifyEmails } from "@/lib/llm/emailClassification";
import { GoogleOAuthError } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

// Error codes that mean "the Gmail link is dead — the user must reconnect".
const RECONNECT_CODES = new Set([
  "invalid_grant", // refresh token revoked or expired (e.g. 7-day Testing limit)
  "not_connected",
  "no_refresh_token",
]);

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user.google?.connectedAt) {
    return NextResponse.json(
      { error: "Gmail is not connected." },
      { status: 400 }
    );
  }

  try {
    const accessToken = await getAccessTokenForUser(user._id);
    const messages = await listRecentMessages(accessToken, { maxResults: 15 });

    // Best-effort classification: if the LLM is unset/unreachable/rate-limited,
    // still return the inbox so reading never depends on the model being up.
    let classified = false;
    try {
      const labels = await classifyEmails(messages);
      messages.forEach((m, i) => {
        m.classification = labels[i] ?? null;
      });
      classified = true;
    } catch {
      // Leave messages unclassified; the UI shows them without a badge.
    }

    return NextResponse.json({ messages, classified });
  } catch (err) {
    if (err instanceof GoogleOAuthError && RECONNECT_CODES.has(err.code)) {
      return NextResponse.json(
        {
          error: "reconnect",
          message:
            "Your Gmail connection has expired. Disconnect and connect Gmail again to keep syncing.",
        },
        { status: 409 }
      );
    }
    // Gmail unreachable / refused, or any other OAuth failure: an upstream
    // problem, not a bug in our request handling.
    if (err instanceof GmailError || err instanceof GoogleOAuthError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
