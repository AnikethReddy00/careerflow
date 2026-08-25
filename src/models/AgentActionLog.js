import mongoose from "mongoose";
import { AGENT_DECISION_VALUES } from "@/lib/enums";

// The audit trail. Every reasoning cycle writes here — including the cycles where
// the agent decides to do NOTHING. Logging no-action is what demonstrates the
// system is continuously reasoning over each application rather than just
// firing on a trigger; it's the academically load-bearing evidence that the
// system is genuinely agentic.
const AgentActionLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Nullable so cycle-level events (not tied to one application) can be logged too.
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },
    cycleAt: { type: Date, default: Date.now },
    decision: { type: String, enum: AGENT_DECISION_VALUES, required: true },
    actionTaken: { type: String }, // human-readable summary of what happened
    reasoningSummary: { type: String }, // why the agent decided this (incl. no_action)
  },
  { timestamps: true }
);

// Audit views: newest-first, per application and per user.
AgentActionLogSchema.index({ applicationId: 1, cycleAt: -1 });
AgentActionLogSchema.index({ userId: 1, cycleAt: -1 });

export default mongoose.models.AgentActionLog ||
  mongoose.model("AgentActionLog", AgentActionLogSchema);
