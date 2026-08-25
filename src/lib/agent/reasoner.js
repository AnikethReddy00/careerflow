// The agent's brain — a PURE decision function. Given one application, the
// user's settings, and the current time, it returns exactly one decision plus a
// human-readable reason. No database, no side effects, no I/O: that's what makes
// it trivially testable and lets an LLM (Gemini) later refine the reasoning
// without touching the acting/logging code in runCycle.js.
//
// The decisions map 1:1 to the AGENT_DECISION enum. update_status is NOT reached
// here — that decision only comes from reading an inbound email (Tier 2), so the
// time-based rules below produce only draft_follow_up / escalate / no_action.

import { APPLICATION_STATUS, AGENT_DECISION } from "@/lib/enums";

const DAY_MS = 24 * 60 * 60 * 1000;

// After this many follow-ups have been queued for an application, stop drafting
// more and escalate to the user instead of nagging forever.
export const MAX_FOLLOWUPS = 2;

// Whole days between two instants (floored, never negative).
export function daysBetween(now, past) {
  const diff = now.getTime() - new Date(past).getTime();
  return Math.max(0, Math.floor(diff / DAY_MS));
}

// The instant we measure staleness from: the most recent thing that happened on
// the application. Falls back through last email → last status change → applied.
function referenceInstant(application) {
  return (
    application.lastEmailAt ||
    application.lastStatusChangeAt ||
    application.applicationDate ||
    application.createdAt
  );
}

export function reason({ application, user, now, followUpCount = 0 }) {
  const threshold = user?.followUpThresholdDays ?? 7;
  const days = daysBetween(now, referenceInstant(application));
  const status = application.currentStatus;

  // Waiting-to-hear-back stages: chase with a follow-up, then escalate.
  if (
    status === APPLICATION_STATUS.APPLIED ||
    status === APPLICATION_STATUS.IN_REVIEW
  ) {
    if (days < threshold) {
      return {
        decision: AGENT_DECISION.NO_ACTION,
        reasoningSummary: `Only ${days}d since last activity (follow-up threshold ${threshold}d) — waiting.`,
      };
    }
    if (followUpCount < MAX_FOLLOWUPS) {
      return {
        decision: AGENT_DECISION.DRAFT_FOLLOW_UP,
        reasoningSummary: `No activity for ${days}d (threshold ${threshold}d); ${followUpCount} follow-up(s) queued so far — drafting another.`,
      };
    }
    return {
      decision: AGENT_DECISION.ESCALATE,
      reasoningSummary: `Still silent after ${followUpCount} follow-ups over ${days}d — escalating for your attention.`,
    };
  }

  // Active conversation stages: don't auto-email, but flag if it goes quiet.
  if (
    status === APPLICATION_STATUS.INTERVIEW ||
    status === APPLICATION_STATUS.ASSESSMENT
  ) {
    if (days >= threshold) {
      return {
        decision: AGENT_DECISION.ESCALATE,
        reasoningSummary: `No update on your ${status} stage in ${days}d — you may want to check in.`,
      };
    }
    return {
      decision: AGENT_DECISION.NO_ACTION,
      reasoningSummary: `In ${status} stage; only ${days}d since last update — waiting.`,
    };
  }

  // Terminal statuses shouldn't reach here (the cycle only scans open apps),
  // but return a safe no-op just in case.
  return {
    decision: AGENT_DECISION.NO_ACTION,
    reasoningSummary: "No monitoring rule applies to this status — nothing to do.",
  };
}
