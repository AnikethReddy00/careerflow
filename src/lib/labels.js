// Human-readable labels for enum values. Enums stay the source of truth for the
// stored strings; this file is purely presentational, so the UI (dropdowns,
// status badges, the Kanban board later) never hard-codes display text.

import {
  SOURCE_PLATFORM,
  APPLICATION_STATUS,
  AGENT_DECISION,
  EMAIL_CLASSIFICATION,
} from "@/lib/enums";

export const SOURCE_PLATFORM_LABELS = {
  [SOURCE_PLATFORM.COMPANY_PORTAL]: "Company Portal",
  [SOURCE_PLATFORM.LINKEDIN]: "LinkedIn",
  [SOURCE_PLATFORM.GREENHOUSE]: "Greenhouse",
  [SOURCE_PLATFORM.LEVER]: "Lever",
  [SOURCE_PLATFORM.WORKDAY]: "Workday",
  [SOURCE_PLATFORM.WELLFOUND]: "Wellfound",
  [SOURCE_PLATFORM.COLD_EMAIL]: "Cold Email",
  [SOURCE_PLATFORM.REFERRAL]: "Referral",
  [SOURCE_PLATFORM.MANUAL]: "Manual",
};

export const APPLICATION_STATUS_LABELS = {
  [APPLICATION_STATUS.APPLIED]: "Applied",
  [APPLICATION_STATUS.IN_REVIEW]: "In Review",
  [APPLICATION_STATUS.INTERVIEW]: "Interview",
  [APPLICATION_STATUS.ASSESSMENT]: "Assessment",
  [APPLICATION_STATUS.OFFER]: "Offer",
  [APPLICATION_STATUS.REJECTED]: "Rejected",
  [APPLICATION_STATUS.WITHDRAWN]: "Withdrawn",
};

// Tailwind badge classes per status — JobSync style (subtle bg with crisp text and border)
export const STATUS_STYLES = {
  [APPLICATION_STATUS.APPLIED]: "bg-slate-100 text-slate-700 border border-slate-200/80",
  [APPLICATION_STATUS.IN_REVIEW]: "bg-blue-50 text-[#0052CC] border border-blue-200/70",
  [APPLICATION_STATUS.INTERVIEW]: "bg-purple-50 text-purple-700 border border-purple-200/70",
  [APPLICATION_STATUS.ASSESSMENT]: "bg-amber-50 text-amber-800 border border-amber-200/70",
  [APPLICATION_STATUS.OFFER]: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
  [APPLICATION_STATUS.REJECTED]: "bg-rose-50 text-rose-700 border border-rose-200/70",
  [APPLICATION_STATUS.WITHDRAWN]: "bg-slate-100 text-slate-500 border border-slate-200/80",
};

// Labels + badge classes for what the agent decided on each cycle.
export const AGENT_DECISION_LABELS = {
  [AGENT_DECISION.UPDATE_STATUS]: "Updated Status",
  [AGENT_DECISION.DRAFT_FOLLOW_UP]: "Drafted Follow-up",
  [AGENT_DECISION.ESCALATE]: "Escalated",
  [AGENT_DECISION.NO_ACTION]: "Waiting",
};

export const AGENT_DECISION_STYLES = {
  [AGENT_DECISION.UPDATE_STATUS]: "bg-blue-50 text-[#0052CC] border border-blue-200/60",
  [AGENT_DECISION.DRAFT_FOLLOW_UP]: "bg-indigo-50 text-indigo-700 border border-indigo-200/60",
  [AGENT_DECISION.ESCALATE]: "bg-amber-50 text-amber-800 border border-amber-200/60",
  [AGENT_DECISION.NO_ACTION]: "bg-slate-100 text-slate-600 border border-slate-200/60",
};

// Labels + badge classes for how the email-intelligence layer classified an inbound message.
export const EMAIL_CLASSIFICATION_LABELS = {
  [EMAIL_CLASSIFICATION.INTERVIEW_INVITATION]: "Interview Invite",
  [EMAIL_CLASSIFICATION.ASSESSMENT]: "Assessment / Test",
  [EMAIL_CLASSIFICATION.OFFER]: "Job Offer",
  [EMAIL_CLASSIFICATION.REJECTION]: "Application Rejection",
  [EMAIL_CLASSIFICATION.GENERAL_REPLY]: "Recruiter Reply",
  [EMAIL_CLASSIFICATION.IRRELEVANT]: "Newsletter / Other",
};

export const EMAIL_CLASSIFICATION_STYLES = {
  [EMAIL_CLASSIFICATION.INTERVIEW_INVITATION]: "bg-purple-50 text-purple-700 border border-purple-200/70",
  [EMAIL_CLASSIFICATION.ASSESSMENT]: "bg-amber-50 text-amber-800 border border-amber-200/70",
  [EMAIL_CLASSIFICATION.OFFER]: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
  [EMAIL_CLASSIFICATION.REJECTION]: "bg-rose-50 text-rose-700 border border-rose-200/70",
  [EMAIL_CLASSIFICATION.GENERAL_REPLY]: "bg-blue-50 text-[#0052CC] border border-blue-200/70",
  [EMAIL_CLASSIFICATION.IRRELEVANT]: "bg-slate-100 text-slate-500 border border-slate-200/70",
};

