// Central source of truth for every enumerated value used across the schema.
// Importing these (instead of typing raw strings) keeps the models, the agent,
// and the UI from drifting out of sync.

export const APPLICATION_STATUS = {
  APPLIED: "applied",
  IN_REVIEW: "in_review",
  INTERVIEW: "interview",
  ASSESSMENT: "assessment",
  OFFER: "offer",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
};
export const APPLICATION_STATUS_VALUES = Object.values(APPLICATION_STATUS);

// Terminal statuses stop the monitoring loop (application is no longer "open").
export const TERMINAL_STATUSES = [
  APPLICATION_STATUS.OFFER,
  APPLICATION_STATUS.REJECTED,
  APPLICATION_STATUS.WITHDRAWN,
];

// The nine intake sources described in the proposal. This is a dropdown field,
// not nine separate integrations.
export const SOURCE_PLATFORM = {
  COMPANY_PORTAL: "company_portal",
  LINKEDIN: "linkedin",
  GREENHOUSE: "greenhouse",
  LEVER: "lever",
  WORKDAY: "workday",
  WELLFOUND: "wellfound",
  COLD_EMAIL: "cold_email",
  REFERRAL: "referral",
  MANUAL: "manual",
};
export const SOURCE_PLATFORM_VALUES = Object.values(SOURCE_PLATFORM);

export const AUTOMATION_MODE = {
  AUTO: "auto",
  APPROVAL_REQUIRED: "approval_required",
};
export const AUTOMATION_MODE_VALUES = Object.values(AUTOMATION_MODE);

// Categories the email-intelligence layer classifies inbound recruiter mail into.
export const EMAIL_CLASSIFICATION = {
  INTERVIEW_INVITATION: "interview_invitation",
  ASSESSMENT: "assessment",
  REJECTION: "rejection",
  OFFER: "offer",
  GENERAL_REPLY: "general_reply",
  IRRELEVANT: "irrelevant",
};
export const EMAIL_CLASSIFICATION_VALUES = Object.values(EMAIL_CLASSIFICATION);

export const OUTREACH_TYPE = {
  FOLLOW_UP: "follow_up",
  COLD_OUTREACH: "cold_outreach",
};
export const OUTREACH_TYPE_VALUES = Object.values(OUTREACH_TYPE);

export const OUTREACH_STATUS = {
  PENDING: "pending", // drafted, waiting for approval
  AUTO_SENT: "auto_sent", // sent automatically (auto mode)
  APPROVED_SENT: "approved_sent", // user approved, sent as drafted
  EDITED_SENT: "edited_sent", // user edited then sent
  REJECTED: "rejected", // user declined to send
  SKIPPED: "skipped", // agent decided not to send after all
};
export const OUTREACH_STATUS_VALUES = Object.values(OUTREACH_STATUS);

// Who performed an action — used in status history and audit logs.
export const ACTOR = {
  AGENT: "agent",
  USER: "user",
  SYSTEM: "system",
};
export const ACTOR_VALUES = Object.values(ACTOR);

// The bounded set of decisions the agent may reach on each cycle.
export const AGENT_DECISION = {
  UPDATE_STATUS: "update_status",
  DRAFT_FOLLOW_UP: "draft_follow_up",
  ESCALATE: "escalate",
  NO_ACTION: "no_action", // the most common outcome — logged so the audit trail is complete
};
export const AGENT_DECISION_VALUES = Object.values(AGENT_DECISION);
