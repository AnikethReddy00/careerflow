// Human-readable labels for enum values. Enums stay the source of truth for the
// stored strings; this file is purely presentational, so the UI (dropdowns,
// status badges, the Kanban board later) never hard-codes display text.

import { SOURCE_PLATFORM, APPLICATION_STATUS, AGENT_DECISION } from "@/lib/enums";

export const SOURCE_PLATFORM_LABELS = {
  [SOURCE_PLATFORM.COMPANY_PORTAL]: "Company portal",
  [SOURCE_PLATFORM.LINKEDIN]: "LinkedIn",
  [SOURCE_PLATFORM.GREENHOUSE]: "Greenhouse",
  [SOURCE_PLATFORM.LEVER]: "Lever",
  [SOURCE_PLATFORM.WORKDAY]: "Workday",
  [SOURCE_PLATFORM.WELLFOUND]: "Wellfound",
  [SOURCE_PLATFORM.COLD_EMAIL]: "Cold email",
  [SOURCE_PLATFORM.REFERRAL]: "Referral",
  [SOURCE_PLATFORM.MANUAL]: "Manual",
};

export const APPLICATION_STATUS_LABELS = {
  [APPLICATION_STATUS.APPLIED]: "Applied",
  [APPLICATION_STATUS.IN_REVIEW]: "In review",
  [APPLICATION_STATUS.INTERVIEW]: "Interview",
  [APPLICATION_STATUS.ASSESSMENT]: "Assessment",
  [APPLICATION_STATUS.OFFER]: "Offer",
  [APPLICATION_STATUS.REJECTED]: "Rejected",
  [APPLICATION_STATUS.WITHDRAWN]: "Withdrawn",
};

// Tailwind badge classes per status — shared by the list, the detail page, and
// the timeline so a status always looks the same wherever it appears.
export const STATUS_STYLES = {
  [APPLICATION_STATUS.APPLIED]: "bg-zinc-100 text-zinc-700",
  [APPLICATION_STATUS.IN_REVIEW]: "bg-blue-100 text-blue-700",
  [APPLICATION_STATUS.INTERVIEW]: "bg-violet-100 text-violet-700",
  [APPLICATION_STATUS.ASSESSMENT]: "bg-amber-100 text-amber-700",
  [APPLICATION_STATUS.OFFER]: "bg-emerald-100 text-emerald-700",
  [APPLICATION_STATUS.REJECTED]: "bg-rose-100 text-rose-700",
  [APPLICATION_STATUS.WITHDRAWN]: "bg-zinc-100 text-zinc-500",
};

// Labels + badge classes for what the agent decided on each cycle. Shared by the
// Activity Log so a decision always reads and looks the same.
export const AGENT_DECISION_LABELS = {
  [AGENT_DECISION.UPDATE_STATUS]: "Updated status",
  [AGENT_DECISION.DRAFT_FOLLOW_UP]: "Drafted follow-up",
  [AGENT_DECISION.ESCALATE]: "Escalated",
  [AGENT_DECISION.NO_ACTION]: "No action",
};

export const AGENT_DECISION_STYLES = {
  [AGENT_DECISION.UPDATE_STATUS]: "bg-blue-100 text-blue-700",
  [AGENT_DECISION.DRAFT_FOLLOW_UP]: "bg-indigo-100 text-indigo-700",
  [AGENT_DECISION.ESCALATE]: "bg-amber-100 text-amber-700",
  [AGENT_DECISION.NO_ACTION]: "bg-zinc-100 text-zinc-600",
};
