"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AGENT_DECISION_LABELS, AGENT_DECISION_STYLES } from "@/lib/labels";

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
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [lastSummary, setLastSummary] = useState(null);

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

  useEffect(() => {
    (async () => {
      await fetchLogs();
    })();
  }, [fetchLogs]);

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
        <Link
          href="/dashboard"
          className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          ← Applications
        </Link>
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
