"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SOURCE_PLATFORM_VALUES,
  APPLICATION_STATUS_VALUES,
  OUTREACH_STATUS,
} from "@/lib/enums";
import { useRequireAuth } from "@/lib/useRequireAuth";
import {
  SOURCE_PLATFORM_LABELS,
  APPLICATION_STATUS_LABELS,
  STATUS_STYLES,
  AGENT_DECISION_LABELS,
  AGENT_DECISION_STYLES,
  EMAIL_CLASSIFICATION_LABELS,
  EMAIL_CLASSIFICATION_STYLES,
} from "@/lib/labels";

const EMPTY_FORM = {
  companyName: "",
  roleTitle: "",
  sourcePlatform: "linkedin",
  resumeVersion: "",
  applicationDate: "",
  jobUrl: "",
  notes: "",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const router = useRouter();
  const { user, checking } = useRequireAuth();

  // Core state
  const [apps, setApps] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [agentLogs, setAgentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Agent / Sync action states
  const [runningAgent, setRunningAgent] = useState(false);
  const [syncingGmail, setSyncingGmail] = useState(false);
  const [agentSummary, setAgentSummary] = useState(null);
  const [syncedMessages, setSyncedMessages] = useState([]);
  const [showMessages, setShowMessages] = useState(false);
  const [updatesApplied, setUpdatesApplied] = useState([]);

  // Form states
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [savingId, setSavingId] = useState(null);

  // AI auto-fill
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");

  // Editing drafts
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [editDraftText, setEditDraftText] = useState("");

  // Filter tab
  const [statusFilter, setStatusFilter] = useState("all");

  const loadData = useCallback(async () => {
    try {
      const [appsRes, draftsRes, logsRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/outreach?status=pending"),
        fetch("/api/agent/logs"),
      ]);

      const [appsData, draftsData, logsData] = await Promise.all([
        appsRes.json(),
        draftsRes.json(),
        logsRes.json(),
      ]);

      if (appsRes.ok) setApps(appsData.applications || []);
      if (draftsRes.ok) setDrafts(draftsData.drafts || []);
      if (logsRes.ok) setAgentLogs((logsData.logs || []).slice(0, 6));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const [appsRes, draftsRes, logsRes] = await Promise.all([
          fetch("/api/applications"),
          fetch("/api/outreach?status=pending"),
          fetch("/api/agent/logs"),
        ]);
        const [appsData, draftsData, logsData] = await Promise.all([
          appsRes.json(),
          draftsRes.json(),
          logsRes.json(),
        ]);
        if (!cancelled) {
          if (appsRes.ok) setApps(appsData.applications || []);
          if (draftsRes.ok) setDrafts(draftsData.drafts || []);
          if (logsRes.ok) setAgentLogs((logsData.logs || []).slice(0, 6));
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add application");
      setApps((prev) => [data.application, ...prev]);
      setForm(EMPTY_FORM);
      setPasteText("");
      setShowPaste(false);
      setExtractError("");
      setNotice(`Added ${data.application.roleTitle} at ${data.application.companyName}`);
      setTimeout(() => setNotice(""), 4000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id, status) {
    setSavingId(id);
    setError("");
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      setApps((prev) => prev.map((a) => (a._id === id ? data.application : a)));
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  }

  // Send the pasted job post to AI model and pre-fill the form
  async function handleExtract() {
    setExtracting(true);
    setExtractError("");
    try {
      const res = await fetch("/api/extract/job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't read that job post");
      const f = data.fields || {};
      setForm((prev) => ({
        ...prev,
        companyName: f.companyName || prev.companyName,
        roleTitle: f.roleTitle || prev.roleTitle,
        sourcePlatform: f.sourcePlatform || prev.sourcePlatform,
        jobUrl: f.jobUrl || "",
        notes: f.notes || "",
      }));
      setShowPaste(false);
      setNotice("Extracted details with AI!");
      setTimeout(() => setNotice(""), 4000);
    } catch (e) {
      setExtractError(e.message);
    } finally {
      setExtracting(false);
    }
  }

  // Trigger agent cycle manually
  async function handleRunAgent() {
    setRunningAgent(true);
    setError("");
    try {
      const res = await fetch("/api/agent/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to run agent cycle");
      setAgentSummary(data.summary);
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setRunningAgent(false);
    }
  }

  // Trigger Gmail Sync & Classification
  async function handleSyncGmail() {
    setSyncingGmail(true);
    setError("");
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync Gmail");
      setSyncedMessages(data.messages || []);
      setUpdatesApplied(data.updatesApplied || []);
      setShowMessages(true);
      const updates = data.updatesApplied?.length || 0;
      setNotice(
        `Gmail synced: ${data.messages?.length || 0} messages retrieved and classified${
          updates > 0 ? `, ${updates} application statuses updated!` : ""
        }`
      );
      setTimeout(() => setNotice(""), 5000);
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setSyncingGmail(false);
    }
  }

  // Quick add an application directly from a triaged email
  async function handleQuickAddFromEmail(msg) {
    const sug = msg.suggestedApplication || {};
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: sug.companyName || "Company",
          roleTitle: sug.roleTitle || "Software Engineer",
          sourcePlatform: "cold_email",
          currentStatus: sug.currentStatus || "applied",
          notes: `Created from email: "${msg.subject}"\n${msg.snippet || ""}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add application");
      setApps((prev) => [data.application, ...prev]);
      setSyncedMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                matchedApplication: {
                  id: data.application._id,
                  companyName: data.application.companyName,
                  roleTitle: data.application.roleTitle,
                },
                suggestedApplication: null,
              }
            : m
        )
      );
      setNotice(`Added ${data.application.roleTitle} @ ${data.application.companyName} to pipeline!`);
      setTimeout(() => setNotice(""), 4000);
    } catch (e) {
      setError(e.message);
    }
  }

  // Handle draft approval / send
  async function handleApproveDraft(draftId, customText) {
    try {
      const res = await fetch(`/api/outreach/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: customText ? OUTREACH_STATUS.EDITED_SENT : OUTREACH_STATUS.APPROVED_SENT,
          finalText: customText || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to approve draft");
      setDrafts((prev) => prev.filter((d) => d._id !== draftId));
      setEditingDraftId(null);
      setNotice("Follow-up marked as approved & sent!");
      setTimeout(() => setNotice(""), 4000);
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  }

  // Handle draft rejection / dismissal
  async function handleDismissDraft(draftId) {
    try {
      const res = await fetch(`/api/outreach/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: OUTREACH_STATUS.REJECTED }),
      });
      if (!res.ok) throw new Error("Failed to dismiss draft");
      setDrafts((prev) => prev.filter((d) => d._id !== draftId));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const labelClass = "mb-1 block text-xs font-medium text-zinc-600";

  const filteredApps = apps.filter((app) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "open") return app.isOpen;
    if (statusFilter === "closed") return !app.isOpen;
    return app.currentStatus === statusFilter;
  });

  if (checking) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50/50 text-zinc-900">
      {/* Navigation Header */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm shadow-indigo-200">
              C
            </span>
            <span className="text-base font-semibold tracking-tight text-zinc-900">
              CareerFlow<span className="text-indigo-600"> AI</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/60 px-3 py-1 text-xs font-medium text-emerald-800 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Groq AI Active (Ultra-Fast)
            </div>
            <Link
              href="/profile"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              Profile
            </Link>
            <Link
              href="/agent"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              Agent Logs
            </Link>
            <Link
              href="/browser"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              Browser
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {/* Banner notices */}
        {notice && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 flex items-center justify-between">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} className="text-emerald-600 hover:text-emerald-900">✕</button>
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-rose-600 hover:text-rose-900">✕</button>
          </div>
        )}

        {/* Command Center Control Bar */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Application Command Center
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Single unified pipeline: intake with AI auto-fill, auto-monitor with reasoner, and review follow-ups.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSyncGmail}
                disabled={syncingGmail}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <span>{syncingGmail ? "Syncing..." : "Sync Recruiter Mail"}</span>
              </button>
              <button
                type="button"
                onClick={handleRunAgent}
                disabled={runningAgent}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <span>{runningAgent ? "Evaluating..." : "Run Agent Loop"}</span>
              </button>
            </div>
          </div>

          {agentSummary && (
            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-900">
              <span className="font-semibold">Last Agent Cycle:</span> Scanned {agentSummary.scanned} applications — {agentSummary.drafted} drafted, {agentSummary.escalated} escalated, {agentSummary.noAction} waiting.
            </div>
          )}
        </div>

        {/* Synced Recruiter Mail & AI Triage Feed */}
        {syncedMessages.length > 0 && (
          <div className="mt-8 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {syncedMessages.length}
                  </span>
                  <h2 className="text-base font-semibold text-zinc-900">
                    Synced Recruiter Mail ({syncedMessages.length} Messages Triaged)
                  </h2>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Inbox scanned and categorized by AI.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMessages((v) => !v)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
              >
                {showMessages ? "Hide Synced Mail" : "Show Synced Mail"}
              </button>
            </div>

            {updatesApplied.length > 0 && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
                <span className="font-semibold">Auto-Updated Pipeline:</span>
                <ul className="mt-1 list-disc list-inside space-y-0.5">
                  {updatesApplied.map((u, i) => (
                    <li key={i}>
                      <span className="font-medium">{u.company}</span>: moved from{" "}
                      <span className="capitalize">{u.fromStatus}</span> to{" "}
                      <span className="font-bold capitalize">{u.toStatus}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showMessages && (
              <ul className="divide-y divide-zinc-100 max-h-[460px] overflow-y-auto pr-1">
                {syncedMessages.map((msg) => (
                  <li key={msg.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {msg.classification && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            EMAIL_CLASSIFICATION_STYLES[msg.classification] ||
                            "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {EMAIL_CLASSIFICATION_LABELS[msg.classification] ||
                            msg.classification}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-zinc-900 truncate max-w-[200px]">
                        {msg.senderName || msg.from}
                      </span>
                      {msg.senderEmail && (
                        <span className="text-[11px] text-zinc-500 font-mono truncate max-w-[240px]">
                          &lt;{msg.senderEmail}&gt;
                        </span>
                      )}

                      {/* Reply action */}
                      <a
                        href={`mailto:${msg.senderEmail || msg.from}?subject=${encodeURIComponent(
                          msg.subject?.startsWith("Re:")
                            ? msg.subject
                            : `Re: ${msg.subject || "Job Application"}`
                        )}`}
                        className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 hover:text-indigo-600 transition"
                        title={`Reply directly to ${msg.senderEmail || msg.from}`}
                      >
                        ✉️ Reply
                      </a>

                      {/* Linked application or quick-add action */}
                      {msg.matchedApplication ? (
                        <Link
                          href={`/dashboard/${msg.matchedApplication.id}`}
                          className="inline-flex items-center gap-1 rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          Linked: {msg.matchedApplication.companyName} ↗
                        </Link>
                      ) : msg.suggestedApplication ? (
                        <button
                          type="button"
                          onClick={() => handleQuickAddFromEmail(msg)}
                          className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          + Track {msg.suggestedApplication.companyName} in Pipeline
                        </button>
                      ) : null}

                      <span className="text-xs text-zinc-400 ml-auto shrink-0">
                        {formatDate(msg.date)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-zinc-900 truncate">
                      {msg.subject || "(No Subject)"}
                    </p>
                    {msg.snippet && (
                      <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">
                        {msg.snippet}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Action Queue: Follow-up Drafts Requiring Approval */}
        {drafts.length > 0 && (
          <div className="mt-8 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                  {drafts.length}
                </span>
                <h2 className="text-base font-semibold text-zinc-900">
                  Agent Follow-Up Queue ({drafts.length} Pending Approval)
                </h2>
              </div>
              <span className="text-xs font-medium text-amber-800">
                Generated with AI + Candidate Profile
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {drafts.map((draft) => {
                const app = draft.applicationId || {};
                const isEditing = editingDraftId === draft._id;

                return (
                  <div
                    key={draft._id}
                    className="flex flex-col justify-between rounded-xl border border-amber-200/80 bg-white p-5 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-900">
                            {app.roleTitle || "Role"} · <span className="text-zinc-600">{app.companyName || "Company"}</span>
                          </h3>
                          <p className="text-xs text-zinc-400">
                            Subject: <span className="text-zinc-700 font-medium">{draft.subject}</span>
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          Follow-up
                        </span>
                      </div>

                      <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-700 whitespace-pre-wrap font-sans">
                        {isEditing ? (
                          <textarea
                            rows={6}
                            className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-800 focus:outline-none focus:border-indigo-500"
                            value={editDraftText}
                            onChange={(e) => setEditDraftText(e.target.value)}
                          />
                        ) : (
                          draft.finalText || draft.draftText
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingDraftId(null)}
                            className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveDraft(draft._id, editDraftText)}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                          >
                            Save & Approve
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDraftId(draft._id);
                                setEditDraftText(draft.finalText || draft.draftText);
                              }}
                              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDismissDraft(draft._id)}
                              className="text-xs font-medium text-zinc-400 hover:text-rose-600"
                            >
                              Dismiss
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApproveDraft(draft._id)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm"
                          >
                            Approve & Mark Sent ✓
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Job Intake Section */}
        <div className="mt-8 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                1-Click Job Intake & AI Extraction
              </h2>
              <p className="text-xs text-zinc-500">
                Paste any job posting or fill directly — AI extracts role, company, platform, and key skills.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPaste((v) => !v)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              {showPaste ? "Collapse Paste Box" : "+ Paste Full Job Description"}
            </button>
          </div>

          {showPaste && (
            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
              <textarea
                rows={5}
                className={inputClass}
                placeholder="Paste the job posting description here (requirements, role, company)..."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={extracting || pasteText.trim().length < 40}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {extracting ? "Extracting with AI..." : "Extract with AI"}
                </button>
                {extractError && (
                  <span className="text-xs text-rose-600">{extractError}</span>
                )}
              </div>
            </div>
          )}

          {/* Add form */}
          <form onSubmit={handleSubmit} className="mt-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="companyName">
                  Company <span className="text-rose-500">*</span>
                </label>
                <input
                  id="companyName"
                  className={inputClass}
                  placeholder="e.g. Stripe, Google"
                  value={form.companyName}
                  onChange={update("companyName")}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="roleTitle">
                  Role Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="roleTitle"
                  className={inputClass}
                  placeholder="e.g. Software Engineer"
                  value={form.roleTitle}
                  onChange={update("roleTitle")}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="sourcePlatform">
                  Source <span className="text-rose-500">*</span>
                </label>
                <select
                  id="sourcePlatform"
                  className={inputClass}
                  value={form.sourcePlatform}
                  onChange={update("sourcePlatform")}
                >
                  {SOURCE_PLATFORM_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {SOURCE_PLATFORM_LABELS[v]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="jobUrl">
                  Job Link / Portal URL
                </label>
                <input
                  id="jobUrl"
                  className={inputClass}
                  placeholder="https://..."
                  value={form.jobUrl}
                  onChange={update("jobUrl")}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="applicationDate">
                  Applied Date
                </label>
                <input
                  id="applicationDate"
                  type="date"
                  className={inputClass}
                  value={form.applicationDate}
                  onChange={update("applicationDate")}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60"
                >
                  {submitting ? "Adding..." : "+ Add to Pipeline"}
                </button>
              </div>
            </div>

            {form.notes && (
              <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
                <span className="font-semibold text-zinc-800">Extracted Notes:</span> {form.notes}
              </div>
            )}
          </form>
        </div>

        {/* Application Pipeline & Tracker */}
        <div className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Active Job Pipeline ({apps.length})
              </h2>
              <p className="text-xs text-zinc-500">
                The autonomous agent actively tracks open roles and reasons over days of silence.
              </p>
            </div>
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 bg-zinc-100 p-1 rounded-xl text-xs">
              {["all", "open", "applied", "in_review", "interview", "assessment", "closed"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-medium capitalize transition ${
                    statusFilter === tab
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {tab.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-400">
              Loading applications…
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-14 text-center">
              <p className="text-sm font-medium text-zinc-700">No applications match this view</p>
              <p className="mt-1 text-xs text-zinc-400">Add a role above to kick off monitoring.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
              <ul className="divide-y divide-zinc-100">
                {filteredApps.map((app) => (
                  <li
                    key={app._id}
                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between transition hover:bg-zinc-50/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <Link
                          href={`/dashboard/${app._id}`}
                          className="truncate text-sm font-bold text-zinc-900 hover:text-indigo-600"
                        >
                          {app.roleTitle}
                        </Link>
                        <span className="text-zinc-300">·</span>
                        <span className="truncate text-sm font-medium text-zinc-600">
                          {app.companyName}
                        </span>
                        {app.jobUrl && (
                          <Link
                            href={`/browser?url=${encodeURIComponent(app.jobUrl)}`}
                            className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100"
                            title="Open in Browser Assist"
                          >
                            Browser Assist ↗
                          </Link>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-400">
                        <span className="font-medium text-zinc-500">
                          {SOURCE_PLATFORM_LABELS[app.sourcePlatform] || app.sourcePlatform}
                        </span>
                        <span>·</span>
                        <span>Applied {formatDate(app.applicationDate)}</span>
                        {app.lastEmailAt && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-600 font-medium">
                              Last Mail: {formatDate(app.lastEmailAt)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <select
                        aria-label="Change status"
                        value={app.currentStatus}
                        disabled={savingId === app._id}
                        onChange={(e) => handleStatusChange(app._id, e.target.value)}
                        className={`cursor-pointer rounded-full border-0 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 ${
                          STATUS_STYLES[app.currentStatus] || "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {APPLICATION_STATUS_VALUES.map((v) => (
                          <option key={v} value={v}>
                            {APPLICATION_STATUS_LABELS[v]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Live Reasoner Audit Log Stream */}
        {agentLogs.length > 0 && (
          <div className="mt-8 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Autonomous Agent Decision Feed
                </h2>
                <p className="text-xs text-zinc-500">
                  Transparent audit log showing what the agent evaluated and why.
                </p>
              </div>
              <Link href="/agent" className="text-xs font-medium text-indigo-600 hover:underline">
                View all logs →
              </Link>
            </div>

            <div className="space-y-2.5">
              {agentLogs.map((log) => {
                const app = log.applicationId || {};
                return (
                  <div
                    key={log._id}
                    className="flex flex-col gap-1 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          AGENT_DECISION_STYLES[log.decision] || "bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        {AGENT_DECISION_LABELS[log.decision] || log.decision}
                      </span>
                      <span className="font-semibold text-zinc-800 truncate">
                        {app.roleTitle ? `${app.roleTitle} @ ${app.companyName}` : "Application"}
                      </span>
                      <span className="text-zinc-400 truncate hidden md:inline">
                        — {log.reasoningSummary}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 shrink-0">
                      {formatTime(log.cycleAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
