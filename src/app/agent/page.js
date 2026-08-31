"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AGENT_DECISION_LABELS,
  AGENT_DECISION_STYLES,
  EMAIL_CLASSIFICATION_LABELS,
  EMAIL_CLASSIFICATION_STYLES,
} from "@/lib/labels";
import { useRequireAuth } from "@/lib/useRequireAuth";

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DecisionBadge({ decision }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
        AGENT_DECISION_STYLES[decision] || "bg-zinc-100 text-zinc-600"
      }`}
    >
      {AGENT_DECISION_LABELS[decision] || decision}
    </span>
  );
}

// A short, plain-language recap of what a cycle just did.
function summaryLine(s) {
  if (!s) return "";
  if (s.scanned === 0) {
    return "No open applications to check — add or reopen one, then run again.";
  }
  const parts = [];
  if (s.drafted) parts.push(`${s.drafted} follow-up${s.drafted > 1 ? "s" : ""} drafted`);
  if (s.escalated) parts.push(`${s.escalated} escalated`);
  if (s.noAction) parts.push(`${s.noAction} left alone`);
  return `Checked ${s.scanned} application${s.scanned > 1 ? "s" : ""}: ${parts.join(", ")}.`;
}

export default function AgentActivity() {
  const router = useRouter();
  const { user, checking } = useRequireAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [lastSummary, setLastSummary] = useState(null);
  const [gmail, setGmail] = useState(null); // { connected, email } | null
  const [gmailLoading, setGmailLoading] = useState(true);
  const [gmailBusy, setGmailBusy] = useState(false);
  const [gmailNotice, setGmailNotice] = useState(null); // { tone, text } | null
  const [syncing, setSyncing] = useState(false);
  const [messages, setMessages] = useState(null); // null = not synced yet; [] = synced, empty
  const [syncError, setSyncError] = useState("");
  const [classified, setClassified] = useState(true); // did the last sync attach AI labels?

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/logs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load activity");
      setLogs(data.logs || []);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGmailStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/google/status");
      if (!res.ok) return; // unauthenticated — the auth guard handles redirect
      const data = await res.json();
      setGmail({ connected: data.connected, email: data.email });
    } catch {
      // leave status unknown; the card will show the connect option
    } finally {
      setGmailLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchLogs();
    })();
  }, [fetchLogs]);

  useEffect(() => {
    (async () => {
      await fetchGmailStatus();
    })();
  }, [fetchGmailStatus]);

  // Turn the ?gmail= flag the OAuth callback set into a message, then strip it
  // from the URL so a refresh doesn't re-show it. Wrapped in an IIFE so setState
  // isn't called synchronously in the effect body (React 19 lint rule).
  useEffect(() => {
    (async () => {
      const flag = new URLSearchParams(window.location.search).get("gmail");
      if (!flag) return;
      const messages = {
        connected: { tone: "ok", text: "Gmail connected." },
        denied: { tone: "err", text: "Gmail connection was cancelled." },
        notoken: {
          tone: "err",
          text: "Google didn't return a refresh token — remove CareerFlow at myaccount.google.com/permissions, then connect again.",
        },
        error: {
          tone: "err",
          text: "Something went wrong connecting Gmail. Please try again.",
        },
      };
      setGmailNotice(messages[flag] || null);
      window.history.replaceState(null, "", "/agent");
    })();
  }, []);

  async function handleRun() {
    setRunning(true);
    setError("");
    setLastSummary(null);
    try {
      const res = await fetch("/api/agent/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Agent run failed");
      setLastSummary(data.summary);
      await fetchLogs();
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  async function handleDisconnectGmail() {
    setGmailBusy(true);
    try {
      await fetch("/api/auth/google/disconnect", { method: "POST" });
      setGmail({ connected: false, email: null });
      setGmailNotice(null);
      setMessages(null);
      setSyncError("");
    } finally {
      setGmailBusy(false);
    }
  }

  async function handleSyncInbox() {
    setSyncing(true);
    setSyncError("");
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        // 409 = the Gmail link expired; nudge the user to reconnect rather than
        // showing a raw error.
        if (res.status === 409) {
          setSyncError(
            data.message || "Your Gmail connection expired — reconnect Gmail."
          );
          return;
        }
        throw new Error(data.error || "Couldn't sync your inbox.");
      }
      setMessages(data.messages || []);
      setClassified(data.classified === true);
    } catch (e) {
      setSyncError(e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (checking) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            C
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            CareerFlow<span className="text-indigo-600"> AI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            ← Applications
          </Link>
          <Link
            href="/browser"
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Browser
          </Link>
          {user?.email && (
            <span className="hidden text-sm text-zinc-400 sm:inline">
              {user.email}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Log out
          </button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Agent activity
            </h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-500">
              Every cycle, the agent reviews each open application, decides what
              to do, and records it here — including when it decides to wait.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {running ? "Running…" : "Run agent now"}
          </button>
        </div>

        {/* Gmail connection */}
        <section className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-sm ring-1 ring-zinc-200">
                ✉️
              </span>
              <div>
                <p className="text-sm font-medium text-zinc-800">
                  Gmail connection
                </p>
                {gmailLoading ? (
                  <p className="text-sm text-zinc-400">Checking…</p>
                ) : gmail?.connected ? (
                  <p className="text-sm text-zinc-500">
                    Connected as{" "}
                    <span className="font-medium text-zinc-700">
                      {gmail.email}
                    </span>{" "}
                    — the agent can read recruiter replies.
                  </p>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Not connected. Connect Gmail so the agent can read recruiter
                    replies and update status automatically.
                  </p>
                )}
              </div>
            </div>
            {!gmailLoading &&
              (gmail?.connected ? (
                <button
                  type="button"
                  onClick={handleDisconnectGmail}
                  disabled={gmailBusy}
                  className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                >
                  {gmailBusy ? "Disconnecting…" : "Disconnect"}
                </button>
              ) : (
                <a
                  href="/api/auth/google/start"
                  className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
                >
                  Connect Gmail
                </a>
              ))}
          </div>
          {gmailNotice && (
            <p
              className={`mt-2 text-sm ${
                gmailNotice.tone === "ok" ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {gmailNotice.text}
            </p>
          )}
        </section>

        {/* Inbox — read-only view of the messages the agent can see */}
        {gmail?.connected && (
          <section className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Inbox
              </h2>
              <button
                type="button"
                onClick={handleSyncInbox}
                disabled={syncing}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                {syncing ? "Syncing…" : "Sync inbox"}
              </button>
            </div>

            {syncError && (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {syncError}
              </p>
            )}

            {messages !== null && messages.length > 0 && !classified && (
              <p className="mt-3 text-xs text-zinc-400">
                Showing your inbox without AI labels — set GROQ_API_KEY in
                .env.local to classify these.
              </p>
            )}

            {messages !== null && messages.length === 0 && !syncError && (
              <p className="mt-3 text-sm text-zinc-400">
                No recent inbox messages found.
              </p>
            )}

            {messages !== null && messages.length > 0 && (
              <ul className="mt-3 space-y-2">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-xl border border-zinc-100 bg-white px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      {m.classification && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            EMAIL_CLASSIFICATION_STYLES[m.classification] ||
                            "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {EMAIL_CLASSIFICATION_LABELS[m.classification] ||
                            m.classification}
                        </span>
                      )}
                      <p className="truncate text-sm font-medium text-zinc-800">
                        {m.subject || "(no subject)"}
                      </p>
                      <span className="ml-auto shrink-0 text-xs text-zinc-400">
                        {formatDateTime(m.date)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {m.from}
                    </p>
                    {m.snippet && (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                        {m.snippet}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {lastSummary && (
          <p className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
            {summaryLine(lastSummary)}
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Decision log
          </h2>

          {loading ? (
            <p className="py-10 text-center text-sm text-zinc-400">Loading…</p>
          ) : logs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 py-14 text-center">
              <p className="text-sm font-medium text-zinc-600">
                No agent activity yet
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Click “Run agent now” to have it review your open applications.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li
                  key={log._id}
                  className="rounded-xl border border-zinc-100 bg-white px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <DecisionBadge decision={log.decision} />
                    {log.applicationId ? (
                      <Link
                        href={`/dashboard/${log.applicationId._id}`}
                        className="truncate text-sm font-medium text-zinc-800 hover:underline"
                      >
                        {log.applicationId.roleTitle}
                        <span className="text-zinc-400">
                          {" "}
                          @ {log.applicationId.companyName}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-sm text-zinc-400">
                        (application removed)
                      </span>
                    )}
                    <span className="ml-auto text-xs text-zinc-400">
                      {formatDateTime(log.cycleAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">
                    {log.reasoningSummary}
                  </p>
                  {log.actionTaken && (
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {log.actionTaken}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
