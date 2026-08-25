import mongoose from "mongoose";
import {
  APPLICATION_STATUS,
  APPLICATION_STATUS_VALUES,
  SOURCE_PLATFORM_VALUES,
} from "@/lib/enums";

// The central entity: one row per job application. The monitoring schedule is
// embedded (it is strictly 1:1 with the application, so a separate collection
// would buy nothing), and a few read-hot fields are denormalized onto the
// document so the Kanban board and the agent's cycle query avoid extra lookups.
const ApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Core application facts.
    companyName: { type: String, required: true, trim: true },
    roleTitle: { type: String, required: true, trim: true },
    sourcePlatform: { type: String, enum: SOURCE_PLATFORM_VALUES, required: true },
    resumeVersion: { type: String, trim: true },
    jobUrl: { type: String, trim: true },
    applicationDate: { type: Date, required: true, default: Date.now },
    notes: { type: String },

    // Lifecycle.
    currentStatus: {
      type: String,
      enum: APPLICATION_STATUS_VALUES,
      default: APPLICATION_STATUS.APPLIED,
    },
    // Denormalized "is this still being monitored?" flag. Set to false when the
    // status becomes terminal. Drives the monitoring work queue.
    isOpen: { type: Boolean, default: true },

    // Embedded monitoring schedule (1:1 — no separate collection).
    monitoring: {
      nextCheckAt: { type: Date, default: Date.now },
      lastCheckedAt: { type: Date, default: null },
      checkIntervalDays: { type: Number, default: 3, min: 1 },
    },

    // Denormalized read-optimized fields, kept in sync by the agent/handlers.
    lastEmailAt: { type: Date, default: null },
    lastStatusChangeAt: { type: Date, default: null },
    followUpsSentCount: { type: Number, default: 0 },

    // Hints used to match an inbound recruiter email back to this application.
    // Captured at intake where possible so matching isn't pure guesswork later.
    matching: {
      gmailThreadId: { type: String, default: null }, // confirmation-email thread, if known
      senderDomain: { type: String, default: null }, // e.g. "greenhouse.io"
    },
  },
  { timestamps: true }
);

// Kanban / list view: a user's applications grouped by status.
ApplicationSchema.index({ userId: 1, currentStatus: 1 });

// Monitoring work queue: open applications whose next check is due. Filtering on
// isOpen first keeps terminal applications out of the scan entirely.
ApplicationSchema.index({ isOpen: 1, "monitoring.nextCheckAt": 1 });

export default mongoose.models.Application ||
  mongoose.model("Application", ApplicationSchema);
