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
import { connectDB } from "@/lib/mongodb";
import Application from "@/models/Application";
import StatusHistory from "@/models/StatusHistory";
import AgentActionLog from "@/models/AgentActionLog";
import {
  APPLICATION_STATUS,
  EMAIL_CLASSIFICATION,
  TERMINAL_STATUSES,
  ACTOR,
  AGENT_DECISION,
} from "@/lib/enums";

export const dynamic = "force-dynamic";

// Error codes that mean "the Gmail link is dead — the user must reconnect".
const RECONNECT_CODES = new Set([
  "invalid_grant", // refresh token revoked or expired (e.g. 7-day Testing limit)
  "not_connected",
  "no_refresh_token",
]);

const CLASSIFICATION_TO_STATUS = {
  [EMAIL_CLASSIFICATION.INTERVIEW_INVITATION]: APPLICATION_STATUS.INTERVIEW,
  [EMAIL_CLASSIFICATION.ASSESSMENT]: APPLICATION_STATUS.ASSESSMENT,
  [EMAIL_CLASSIFICATION.OFFER]: APPLICATION_STATUS.OFFER,
  [EMAIL_CLASSIFICATION.REJECTION]: APPLICATION_STATUS.REJECTED,
};

import EmailEvent from "@/models/EmailEvent";

// Helper to extract company name from email sender or subject
function extractCandidateCompany(from, subject) {
  const fromClean = String(from || "").replace(/<.*?>/g, "").trim();
  // Check common recruiter formats: "Recruiter at Acme", "Google Careers", "Stripe Recruiting"
  const atMatch = fromClean.match(/(?:at|from|@)\s*([A-Za-z0-9\s]+)/i);
  if (atMatch && atMatch[1]) return atMatch[1].trim();

  // Try extracting from domain: recruiter@uber.com -> Uber
  const emailMatch = String(from || "").match(/@([a-zA-Z0-9-]+)\./);
  if (emailMatch && emailMatch[1] && !["gmail", "googlemail", "outlook", "hotmail", "yahoo"].includes(emailMatch[1])) {
    return emailMatch[1].charAt(0).toUpperCase() + emailMatch[1].slice(1);
  }

  // From subject: "Interview with Stripe", "Application to Google"
  const subMatch = String(subject || "").match(/(?:with|at|to|for)\s+([A-Z][a-zA-Z0-9\s]+)/);
  if (subMatch && subMatch[1]) return subMatch[1].trim().split(" ")[0];

  return fromClean.split(" ")[0] || "Company";
}

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

  await connectDB();

  try {
    const accessToken = await getAccessTokenForUser(user._id);
    const messages = await listRecentMessages(accessToken, { maxResults: 20 });

    let classified = false;
    const updatesApplied = [];

    try {
      const labels = await classifyEmails(messages);
      messages.forEach((m, i) => {
        m.classification = labels[i] ?? null;
      });
      classified = true;

      // Auto-progress application status based on classified inbound mail
      const openApps = await Application.find({ userId: user._id });

      for (const msg of messages) {
        // Skip irrelevant messages from pipeline progression
        if (!msg.classification || msg.classification === EMAIL_CLASSIFICATION.IRRELEVANT) {
          continue;
        }

        const msgSearchText = `${msg.from || ""} ${msg.subject || ""} ${msg.snippet || ""}`.toLowerCase();
        let matchedApp = null;

        // Match against applications by company name or domain
        for (const app of openApps) {
          const companyKey = app.companyName.toLowerCase().trim();
          if (companyKey.length >= 2 && msgSearchText.includes(companyKey)) {
            matchedApp = app;
            break;
          }
        }

        if (matchedApp) {
          msg.matchedApplication = {
            id: matchedApp._id,
            companyName: matchedApp.companyName,
            roleTitle: matchedApp.roleTitle,
            currentStatus: matchedApp.currentStatus,
          };

          const newStatus = CLASSIFICATION_TO_STATUS[msg.classification];
          const now = new Date();

          if (newStatus && newStatus !== matchedApp.currentStatus) {
            const prev = matchedApp.currentStatus;
            matchedApp.currentStatus = newStatus;
            matchedApp.lastStatusChangeAt = now;
            matchedApp.lastEmailAt = now;
            if (TERMINAL_STATUSES.includes(newStatus)) {
              matchedApp.isOpen = false;
            }
            await matchedApp.save();

            await StatusHistory.create({
              applicationId: matchedApp._id,
              userId: user._id,
              previousStatus: prev,
              newStatus,
              changedBy: ACTOR.AGENT,
              reason: `Inbound email classified as ${msg.classification} ("${msg.subject}")`,
              changedAt: now,
            });

            await AgentActionLog.create({
              userId: user._id,
              applicationId: matchedApp._id,
              cycleAt: now,
              decision: AGENT_DECISION.UPDATE_STATUS,
              actionTaken: `Updated status from ${prev} to ${newStatus}.`,
              reasoningSummary: `Received email with subject "${msg.subject}" classified as ${msg.classification}.`,
            });

            updatesApplied.push({
              applicationId: matchedApp._id,
              company: matchedApp.companyName,
              fromStatus: prev,
              toStatus: newStatus,
            });
          } else {
            matchedApp.lastEmailAt = now;
            await matchedApp.save();
          }
        } else {
          // Unmatched job email -> suggest quick 1-click creation
          const guessedCompany = extractCandidateCompany(msg.from, msg.subject);
          msg.suggestedApplication = {
            companyName: guessedCompany,
            roleTitle: "Software Engineer",
            currentStatus: CLASSIFICATION_TO_STATUS[msg.classification] || APPLICATION_STATUS.APPLIED,
          };
        }

        // Persist relevant EmailEvent in MongoDB
        try {
          await EmailEvent.findOneAndUpdate(
            { gmailMessageId: msg.id },
            {
              $set: {
                userId: user._id,
                applicationId: matchedApp ? matchedApp._id : null,
                gmailMessageId: msg.id,
                gmailThreadId: msg.threadId,
                fromAddress: msg.from,
                subject: msg.subject,
                snippet: msg.snippet,
                classification: msg.classification,
                receivedAt: msg.date ? new Date(msg.date) : new Date(),
              },
            },
            { upsert: true, new: true }
          );
        } catch (dbErr) {
          console.warn("EmailEvent persist warning:", dbErr.message);
        }
      }
    } catch (e) {
      console.warn("Classification / auto-progression notice:", e.message);
    }

    // Only return relevant job/recruiter messages — completely exclude irrelevant emails
    const relevantMessages = messages.filter(
      (m) => m.classification && m.classification !== EMAIL_CLASSIFICATION.IRRELEVANT
    );

    return NextResponse.json({
      messages: relevantMessages,
      totalScanned: messages.length,
      relevantCount: relevantMessages.length,
      classified,
      updatesApplied,
    });
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
