// The observe → reason → decide → act → LOG loop. This is the academically
// load-bearing part of the project: a single cycle scans the applications the
// agent is responsible for, asks the reasoner what to do with each, carries out
// that action, and — crucially — writes an AgentActionLog row for EVERY app it
// looked at, including the ones it decided to leave alone. That complete audit
// trail (not just the emails it sends) is what makes this a genuine agent rather
// than a button that fires templates.
//
// Everything here is rule-based and needs no API keys or OAuth: it reasons over
// timestamps we already store. Gmail reading (to detect replies and update
// status) and LLM-written drafts plug in later without changing this shape.

import { connectDB } from "@/lib/mongodb";
import Application from "@/models/Application";
import OutreachLog from "@/models/OutreachLog";
import AgentActionLog from "@/models/AgentActionLog";
import { getDevUser } from "@/lib/devUser";
import { reason } from "@/lib/agent/reasoner";
import { AGENT_DECISION, OUTREACH_TYPE } from "@/lib/enums";

const DAY_MS = 24 * 60 * 60 * 1000;

// Idempotency key for a follow-up draft: one per application per calendar day.
// Combined with OutreachLog's unique {applicationId, emailType, periodBucket}
// index, this means clicking "Run agent now" repeatedly in a day can't spawn
// duplicate drafts.
function dayBucket(now) {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return `follow_up-${local.toISOString().slice(0, 10)}`;
}

// A plain-text follow-up. This is deliberately a template for now; an LLM will
// personalise it later, but the queue/approval machinery is identical either way.
function buildFollowUpDraft(application) {
  const applied = application.applicationDate
    ? new Date(application.applicationDate).toLocaleDateString()
    : "recently";
  const subject = `Following up — ${application.roleTitle} application`;
  const draftText =
    `Hi,\n\n` +
    `I wanted to follow up on my application for the ${application.roleTitle} ` +
    `role at ${application.companyName} (submitted ${applied}). I'm still very ` +
    `interested in the opportunity and would welcome any update on where things ` +
    `stand.\n\n` +
    `Thank you for your time.\n\nBest regards`;
  return { subject, draftText };
}

// Run one agent cycle for the (dev) user.
//   force=false → only applications actually due (monitoring.nextCheckAt <= now),
//                 as a scheduled run would behave.
//   force=true  → every open application, so a manual "Run now" always produces
//                 visible, up-to-date reasoning instead of "nothing was due".
export async function runAgentCycle({ force = false } = {}) {
  await connectDB();
  const user = await getDevUser();
  const now = new Date();

  const query = { userId: user._id, isOpen: true };
  if (!force) {
    query["monitoring.nextCheckAt"] = { $lte: now };
  }

  const applications = await Application.find(query);

  const summary = {
    ranAt: now.toISOString(),
    scanned: applications.length,
    drafted: 0,
    escalated: 0,
    noAction: 0,
  };

  for (const application of applications) {
    // Count follow-ups already queued/sent for this app so the reasoner knows
    // when to stop drafting and escalate instead.
    const followUpCount = await OutreachLog.countDocuments({
      applicationId: application._id,
      emailType: OUTREACH_TYPE.FOLLOW_UP,
    });

    const { decision, reasoningSummary } = reason({
      application,
      user,
      now,
      followUpCount,
    });

    let actionTaken;

    if (decision === AGENT_DECISION.DRAFT_FOLLOW_UP) {
      const { subject, draftText } = buildFollowUpDraft(application);
      try {
        await OutreachLog.create({
          userId: user._id,
          applicationId: application._id,
          emailType: OUTREACH_TYPE.FOLLOW_UP,
          periodBucket: dayBucket(now),
          subject,
          draftText,
        });
        actionTaken = "Queued a follow-up draft for your approval.";
        summary.drafted += 1;
      } catch (err) {
        // Duplicate key → a draft for this app already exists today. Not an
        // error; just nothing new to queue.
        if (err && err.code === 11000) {
          actionTaken = "A follow-up was already queued today — skipped.";
        } else {
          throw err;
        }
      }
    } else if (decision === AGENT_DECISION.ESCALATE) {
      actionTaken = "Flagged for your attention.";
      summary.escalated += 1;
    } else {
      actionTaken = "No action needed this cycle.";
      summary.noAction += 1;
    }

    // Reschedule the next check regardless of the decision, so the monitoring
    // queue keeps moving.
    const intervalDays =
      application.monitoring?.checkIntervalDays ||
      user.defaultCheckIntervalDays ||
      3;
    application.monitoring.lastCheckedAt = now;
    application.monitoring.nextCheckAt = new Date(
      now.getTime() + intervalDays * DAY_MS
    );
    await application.save();

    // The audit row — written for every application, every cycle, including
    // no_action. This is the evidence of autonomous decision-making.
    await AgentActionLog.create({
      userId: user._id,
      applicationId: application._id,
      cycleAt: now,
      decision,
      actionTaken,
      reasoningSummary,
    });
  }

  return summary;
}
