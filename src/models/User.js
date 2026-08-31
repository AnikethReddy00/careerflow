import mongoose from "mongoose";
import { AUTOMATION_MODE, AUTOMATION_MODE_VALUES } from "@/lib/enums";

// One row per registered user, plus their automation preferences and the
// server-side Gmail credentials (populated later, in the OAuth stage).
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: String },

    // bcrypt hash of the user's password. `select: false` keeps it out of every
    // ordinary query result, so it can never accidentally be sent to the client;
    // login explicitly re-includes it with .select("+passwordHash").
    passwordHash: { type: String, select: false },

    // Gmail OAuth material, populated when the user connects their Gmail account.
    google: {
      // Which Google account is connected. Safe to display — used in the UI and
      // later for matching recruiter emails by sender/thread.
      email: { type: String },
      connectedAt: { type: Date },

      // OAuth tokens are secrets: `select: false` keeps them out of ordinary
      // query results (same guard as passwordHash), so they can never be sent to
      // the client by accident. Read them explicitly with
      // .select("+google.refreshToken") only where needed (revoke, and later
      // minting short-lived access tokens). The refresh token is the long-lived
      // credential that lets the agent read Gmail while the user is away.
      refreshToken: { type: String, select: false },
      accessToken: { type: String, select: false },
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
