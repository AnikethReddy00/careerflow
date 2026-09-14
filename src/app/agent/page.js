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
import {
  Zap,
  Mail,
  RefreshCw,
  ArrowRight,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

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
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
        AGENT_DECISION_STYLES[decision] || "bg-slate-100 text-slate-600 border border-slate-200"
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

  useEffect(() => {
    (async () => {
      const flag = new URLSearchParams(window.location.search).get("gmail");
      if (!flag) return;
      const messages = {
        connected: { tone: "ok", text: "Gmail connected successfully." },
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

  async function handleRunAgent() {
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
      <div className="flex flex-1 items-center justify-center bg-[#F8FAFC] text-sm text-slate-400 font-sans">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A] font-sans">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0052CC] text-sm font-bold text-white shadow-sm shadow-[#0052CC]/25">
              C
            </span>
            <span className="text-base font-bold tracking-tight text-[#0F172A]">
              CareerFlow<span className="text-[#0052CC]"> AI</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Dashboard
            </Link>
            <Link
              href="/jobs"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Recommended Jobs
            </Link>
            <Link
              href="/intelligence"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Intelligence
            </Link>
            <Link
              href="/profile"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Profile
            </Link>
            <Link
              href="/agent"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#0052CC] bg-blue-50/80"
            >
              Agent Logs
            </Link>
            <Link
              href="/browser"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Browser
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">
              Agent Activity & Audit Logs
            </h1>
            <p className="mt-1 max-w-xl text-sm text-[#64748B]">
              Every cycle, the agent reviews each open application, decides what
              to do, and records it here — including when it decides to wait.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunAgent}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0052CC] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0052CC]/25 transition hover:bg-[#0043A4] hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Zap className="h-4 w-4 text-white" />
            <span>{running ? "Running…" : "Run Agent Loop"}</span>
          </button>
        </div>

        {/* Gmail connection Card */}
        <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg border border-blue-200/60 text-[#0052CC]">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-[#0F172A]">
                  Gmail OAuth Connection
                </p>
                {gmailLoading ? (
                  <p className="text-xs text-slate-400">Checking…</p>
                ) : gmail?.connected ? (
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Connected as{" "}
                    <span className="font-semibold text-slate-800 font-mono">
                      {gmail.email}
                    </span>{" "}
                    — the agent reads and classifies recruiter replies automatically.
                  </p>
                ) : (
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Not connected. Connect Gmail so the agent can scan recruiter
                    replies and update pipeline statuses.
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
                  className="shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {gmailBusy ? "Disconnecting…" : "Disconnect"}
                </button>
              ) : (
                <a
                  href="/api/auth/google/start"
                  className="inline-flex items-center gap-1.5 shrink-0 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-[#0052CC]/25 transition hover:bg-[#0043A4]"
                >
                  <span>Connect Gmail</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              ))}
          </div>
          {gmailNotice && (
            <p
              className={`mt-3 text-xs font-semibold ${
                gmailNotice.tone === "ok" ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {gmailNotice.text}
            </p>
          )}
        </section>

        {/* Inbox Section */}
        {gmail?.connected && (
          <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Synced Mailbox
                </h2>
                <p className="text-xs text-[#64748B]">Messages retrieved from Gmail and triaged by Groq AI.</p>
              </div>
              <button
                type="button"
                onClick={handleSyncInbox}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                <span>{syncing ? "Syncing…" : "Sync Inbox Now"}</span>
              </button>
            </div>

            {syncError && (
              <p className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-800">
                {syncError}
              </p>
            )}

            {messages !== null && messages.length === 0 && (
              <p className="mt-4 rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-3 text-xs text-slate-500">
                No recruiter or application-related messages found in recent inbox sync (non-job emails filtered out).
              </p>
            )}

            {messages !== null && messages.length > 0 && (
              <ul className="mt-4 divide-y divide-slate-100">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className="py-3.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      {m.classification && (
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            EMAIL_CLASSIFICATION_STYLES[m.classification] ||
                            "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {EMAIL_CLASSIFICATION_LABELS[m.classification] ||
                            m.classification}
                        </span>
                      )}
                      <p className="truncate text-xs font-bold text-[#0F172A]">
                        {m.subject || "(no subject)"}
                      </p>
                      <span className="ml-auto shrink-0 text-xs text-slate-400">
                        {formatDateTime(m.date)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-700">
                        {m.senderName || m.from}
                      </span>
                      {m.senderEmail && (
                        <span className="text-slate-500 font-mono text-[11px]">
                          &lt;{m.senderEmail}&gt;
                        </span>
                      )}
                      <a
                        href={`mailto:${m.senderEmail || m.from}?subject=${encodeURIComponent(
                          m.subject?.startsWith("Re:") ? m.subject : `Re: ${m.subject || ""}`
                        )}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-[#0052CC] hover:bg-slate-50"
                      >
                        <Mail className="h-3 w-3" />
                        <span>Reply</span>
                      </a>
                    </div>
                    {m.snippet && (
                      <p className="mt-1 line-clamp-2 text-xs text-[#64748B]">
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
          <p className="mt-4 rounded-xl bg-blue-50/80 border border-blue-200/80 px-4 py-3 text-xs font-semibold text-[#0052CC]">
            {summaryLine(lastSummary)}
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-800">
            {error}
          </p>
        )}

        <section className="mt-8">
          <h2 className="mb-3 text-base font-bold text-[#0F172A]">
            Autonomous Decision Log
          </h2>

          {loading ? (
            <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
          ) : logs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-14 text-center bg-white">
              <p className="text-sm font-semibold text-slate-700">
                No agent activity yet
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Click “Run agent loop” to review your open applications.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => (
                <li
                  key={log._id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <DecisionBadge decision={log.decision} />
                    {log.applicationId ? (
                      <Link
                        href={`/dashboard/${log.applicationId._id}`}
                        className="truncate text-xs font-bold text-[#0F172A] hover:text-[#0052CC]"
                      >
                        {log.applicationId.roleTitle}
                        <span className="text-slate-400 font-normal">
                          {" "}
                          @ {log.applicationId.companyName}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">
                        (application removed)
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-slate-400 font-medium">
                      {formatDateTime(log.cycleAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    {log.reasoningSummary}
                  </p>
                  {log.actionTaken && (
                    <p className="mt-1 text-[11px] text-[#0052CC] font-semibold">
                      Action: {log.actionTaken}
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

