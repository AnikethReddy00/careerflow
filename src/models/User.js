import mongoose from "mongoose";
import { AUTOMATION_MODE, AUTOMATION_MODE_VALUES } from "@/lib/enums";

// One row per registered user, plus their automation preferences and the
// server-side Gmail credentials (populated later, in the OAuth stage).
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: String },

    // Gmail OAuth material. Stored server-side only, never sent to the client.
    // Left empty until the OAuth flow is wired up.
    google: {
      accessToken: { type: String },
      refreshToken: { type: String },
      tokenExpiresAt: { type: Date },
      scopes: [{ type: String }],
    },

    // Cursor for incremental Gmail sync (users.history.list) so each cycle only
    // reads new mail instead of rescanning the inbox.
    gmailLastHistoryId: { type: String },

    // Automation preferences.
    automationMode: {
      type: String,
      enum: AUTOMATION_MODE_VALUES,
      default: AUTOMATION_MODE.APPROVAL_REQUIRED, // safe default: nothing sends without review
    },
    followUpThresholdDays: { type: Number, default: 7, min: 1 },
    defaultCheckIntervalDays: { type: Number, default: 3, min: 1 },

    // Global kill switch. While false, the agent may draft but never actually
    // send email for this user — the primary safety control during development.
    agentSendingEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// `unique: true` on email already creates the needed index.

export default mongoose.models.User || mongoose.model("User", UserSchema);
