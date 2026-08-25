import mongoose from "mongoose";
import { EMAIL_CLASSIFICATION_VALUES } from "@/lib/enums";

// One row per inbound email the system has read and classified. We store a short
// snippet and metadata only — not full bodies — to respect the privacy constraint
// in the proposal.
const EmailEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Nullable: an email may not match any tracked application (yet). Unmatched
    // mail is escalated to the user rather than force-matched.
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },

    gmailMessageId: { type: String, required: true },
    gmailThreadId: { type: String },
    fromAddress: { type: String },
    senderDomain: { type: String }, // used as a matching signal
    subject: { type: String },
    snippet: { type: String }, // short preview only

    classification: { type: String, enum: EMAIL_CLASSIFICATION_VALUES },
    classificationConfidence: { type: Number, min: 0, max: 1, default: null },
    receivedAt: { type: Date },
  },
  { timestamps: true }
);

// A given Gmail message must be processed at most once, ever. This unique index
// makes reprocessing the same message on a later cycle impossible.
EmailEventSchema.index({ gmailMessageId: 1 }, { unique: true });

export default mongoose.models.EmailEvent ||
  mongoose.model("EmailEvent", EmailEventSchema);
