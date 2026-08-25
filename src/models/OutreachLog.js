import mongoose from "mongoose";
import {
  OUTREACH_TYPE_VALUES,
  OUTREACH_STATUS,
  OUTREACH_STATUS_VALUES,
} from "@/lib/enums";

// One row per outbound email the agent drafts — whether it is auto-sent,
// approved, edited, skipped, or still pending. This is also the idempotency
// ledger that prevents accidentally double-emailing a real recruiter.
const OutreachLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    emailType: { type: String, enum: OUTREACH_TYPE_VALUES, required: true },

    // Idempotency key: the time window this outreach belongs to (e.g. "2026-W34"
    // or "followup-1"). Combined with applicationId + emailType in the unique
    // index below, it guarantees one send per window.
    periodBucket: { type: String, required: true },

    toAddress: { type: String },
    subject: { type: String },
    draftText: { type: String }, // what the LLM produced
    finalText: { type: String }, // what actually got sent (may be user-edited)

    status: {
      type: String,
      enum: OUTREACH_STATUS_VALUES,
      default: OUTREACH_STATUS.PENDING,
    },
    gmailMessageId: { type: String, default: null }, // set once actually sent
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// THE idempotency guard. Insert this row BEFORE calling Gmail send; if the insert
// throws a duplicate-key error, the outreach already went out this window, so we
// skip the send. Atomic, and works on a standalone (non-replica-set) Mongo.
OutreachLogSchema.index(
  { applicationId: 1, emailType: 1, periodBucket: 1 },
  { unique: true }
);

export default mongoose.models.OutreachLog ||
  mongoose.model("OutreachLog", OutreachLogSchema);
