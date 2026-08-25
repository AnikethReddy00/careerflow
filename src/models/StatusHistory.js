import mongoose from "mongoose";
import {
  APPLICATION_STATUS_VALUES,
  ACTOR_VALUES,
} from "@/lib/enums";

// Append-only log of every status change, powering the per-application timeline
// and proving whether the agent or the user made each change.
const StatusHistorySchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    previousStatus: { type: String, enum: APPLICATION_STATUS_VALUES, default: null },
    newStatus: { type: String, enum: APPLICATION_STATUS_VALUES, required: true },
    changedBy: { type: String, enum: ACTOR_VALUES, required: true },
    reason: { type: String }, // e.g. "classified interview_invitation from email"
    changedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Timeline view: newest-first history for one application.
StatusHistorySchema.index({ applicationId: 1, changedAt: -1 });

export default mongoose.models.StatusHistory ||
  mongoose.model("StatusHistory", StatusHistorySchema);
