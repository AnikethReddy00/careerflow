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
import {
  Mail,
  Zap,
  Check,
  X,
  Sparkles,
  Plus,
  ExternalLink,
  ChevronRight,
  Send,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import NavigationSheet from "@/components/NavigationSheet";
import AppLayout from "@/components/AppLayout";

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
      const relevant = (data.messages || []).filter(
        (m) => m.classification && m.classification !== "irrelevant"
      );
      setSyncedMessages(relevant);
      setUpdatesApplied(data.updatesApplied || []);
      setShowMessages(true);
      const updates = data.updatesApplied?.length || 0;
      if (relevant.length > 0) {
        setNotice(
          `Gmail synced: ${relevant.length} relevant recruiter message${relevant.length === 1 ? "" : "s"} triaged${
            updates > 0 ? `, ${updates} application status update(s) applied!` : "!"
          }`
        );
      } else {
        setNotice(
          `Gmail synced: Scanned recent inbox (${data.totalScanned || 0} emails), non-job emails filtered out.`
        );
      }
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
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-slate-400 transition focus:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/15";
  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

  const filteredApps = apps.filter((app) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "open") return app.isOpen;
    if (statusFilter === "closed") return !app.isOpen;
    return app.currentStatus === statusFilter;
  });

  if (checking) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F8FAFC] text-sm text-slate-400 font-sans">
        Loading…
      </div>
    );
  }

  return (
    <AppLayout user={user}>
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 dark:border-slate-800 dark:bg-[#0F172A]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <NavigationSheet user={user} />
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0052CC] text-sm font-bold text-white shadow-sm shadow-[#0052CC]/25">
                C
              </span>
              <span className="text-base font-bold tracking-tight text-[#0F172A] dark:text-white">
                CareerFlow<span className="text-[#0052CC] dark:text-[#2684FF]"> AI</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 md:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Groq AI Active
            </div>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {/* Banner notices */}
        {notice && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 flex items-center justify-between shadow-sm">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} className="text-emerald-700 hover:text-emerald-950 p-0.5"><X className="h-4 w-4" /></button>
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900 flex items-center justify-between shadow-sm">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-rose-700 hover:text-rose-950 p-0.5"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Command Center Control Bar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">
                Application Command Center
              </h1>
              <p className="mt-1 text-sm text-[#64748B]">
                Single unified pipeline: intake with AI auto-fill, auto-monitor with reasoner, and review follow-ups.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSyncGmail}
                disabled={syncingGmail}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
              >
                <Mail className="h-4 w-4 text-slate-500" />
                <span>{syncingGmail ? "Syncing Gmail..." : "Sync Recruiter Mail"}</span>
              </button>
              <button
                type="button"
                onClick={handleRunAgent}
                disabled={runningAgent}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0052CC] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0052CC]/25 transition hover:bg-[#0043A4] hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Zap className="h-4 w-4 text-white" />
                <span>{runningAgent ? "Evaluating..." : "Run Agent Loop"}</span>
              </button>
            </div>
          </div>

          {agentSummary && (
            <div className="mt-4 rounded-xl border border-blue-200/70 bg-blue-50/70 px-4 py-3 text-xs text-[#0052CC]">
              <span className="font-bold">Last Agent Cycle:</span> Scanned {agentSummary.scanned} applications — {agentSummary.drafted} drafted, {agentSummary.escalated} escalated, {agentSummary.noAction} waiting.
            </div>
          )}
        </div>

        {/* Synced Recruiter Mail & AI Triage Feed */}
        {syncedMessages.length > 0 && (
          <div className="mt-8 rounded-2xl border border-blue-200/80 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0052CC] text-xs font-bold text-white">
                    {syncedMessages.length}
                  </span>
                  <h2 className="text-base font-bold text-[#0F172A]">
                    Synced Recruiter Mail ({syncedMessages.length} Relevant Messages)
                  </h2>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Inbox scanned and filtered by AI — showing only actionable recruiter & application emails.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMessages((v) => !v)}
                className="text-xs font-semibold text-[#0052CC] hover:text-[#0043A4] underline"
              >
                {showMessages ? "Hide Synced Mail" : "Show Synced Mail"}
              </button>
            </div>

            {updatesApplied.length > 0 && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-900">
                <span className="font-bold">Auto-Updated Pipeline:</span>
                <ul className="mt-1 list-disc list-inside space-y-0.5">
                  {updatesApplied.map((u, i) => (
                    <li key={i}>
                      <span className="font-semibold">{u.company}</span>: moved from{" "}
                      <span className="capitalize">{u.fromStatus}</span> to{" "}
                      <span className="font-bold capitalize text-emerald-800">{u.toStatus}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showMessages && (
              <ul className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto pr-1">
                {syncedMessages.map((msg) => (
                  <li key={msg.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {msg.classification && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            EMAIL_CLASSIFICATION_STYLES[msg.classification] ||
                            "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {EMAIL_CLASSIFICATION_LABELS[msg.classification] ||
                            msg.classification}
                        </span>
                      )}
                      <span className="text-xs font-bold text-[#0F172A] truncate max-w-[200px]">
                        {msg.senderName || msg.from}
                      </span>
                      {msg.senderEmail && (
                        <span className="text-[11px] text-slate-500 font-mono truncate max-w-[240px]">
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
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0052CC] transition"
                        title={`Reply directly to ${msg.senderEmail || msg.from}`}
                      >
                        <Mail className="h-3 w-3 text-slate-500" />
                        <span>Reply</span>
                      </a>

                      {/* Linked application or quick-add action */}
                      {msg.matchedApplication ? (
                        <Link
                          href={`/dashboard/${msg.matchedApplication.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-[#0052CC] hover:bg-blue-100"
                        >
                          <span>Linked: {msg.matchedApplication.companyName}</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : msg.suggestedApplication ? (
                        <button
                          type="button"
                          onClick={() => handleQuickAddFromEmail(msg)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Track {msg.suggestedApplication.companyName} in Pipeline</span>
                        </button>
                      ) : null}

                      <span className="text-xs text-slate-400 ml-auto shrink-0">
                        {formatDate(msg.date)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#0F172A] truncate">
                      {msg.subject || "(No Subject)"}
                    </p>
                    {msg.snippet && (
                      <p className="mt-0.5 text-xs text-[#64748B] line-clamp-2">
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
                <h2 className="text-base font-bold text-[#0F172A]">
                  Agent Follow-Up Queue ({drafts.length} Pending Approval)
                </h2>
              </div>
              <span className="text-xs font-semibold text-amber-800">
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
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-[#0F172A]">
                            {app.roleTitle || "Role"} · <span className="text-slate-600">{app.companyName || "Company"}</span>
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Subject: <span className="text-slate-700 font-semibold">{draft.subject}</span>
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-100/80 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                          Follow-up
                        </span>
                      </div>

                      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-700 whitespace-pre-wrap font-sans">
                        {isEditing ? (
                          <textarea
                            rows={6}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0052CC]"
                            value={editDraftText}
                            onChange={(e) => setEditDraftText(e.target.value)}
                          />
                        ) : (
                          draft.finalText || draft.draftText
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingDraftId(null)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveDraft(draft._id, editDraftText)}
                            className="rounded-xl bg-[#0052CC] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0043A4]"
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
                              className="text-xs font-semibold text-[#0052CC] hover:underline"
                            >
                              Edit Draft
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDismissDraft(draft._id)}
                              className="text-xs font-medium text-slate-400 hover:text-rose-600"
                            >
                              Dismiss
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApproveDraft(draft._id)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Approve & Mark Sent</span>
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
        <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                1-Click Job Intake & AI Extraction
              </h2>
              <p className="text-xs text-[#64748B]">
                Paste any job posting or fill directly — AI extracts role, company, platform, and key skills.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPaste((v) => !v)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              {showPaste ? "Collapse Paste Box" : "+ Paste Full Job Description"}
            </button>
          </div>

          {showPaste && (
            <div className="mt-4 rounded-2xl border border-blue-200/80 bg-blue-50/30 p-4">
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0043A4] disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{extracting ? "Extracting with AI..." : "Extract with AI"}</span>
                </button>
                {extractError && (
                  <span className="text-xs text-rose-600 font-medium">{extractError}</span>
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
                  className="w-full rounded-xl bg-[#0052CC] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0052CC]/25 transition hover:bg-[#0043A4] hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {submitting ? "Adding..." : "+ Add to Pipeline"}
                </button>
              </div>
            </div>

            {form.notes && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Extracted Notes:</span> {form.notes}
              </div>
            )}
          </form>
        </div>

        {/* Application Pipeline & Tracker */}
        <div className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
                Active Job Pipeline ({apps.length})
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                The autonomous agent actively tracks open roles and reasons over days of silence.
              </p>
            </div>
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl text-xs border border-slate-200/60 dark:border-slate-700">
              {["all", "open", "applied", "in_review", "interview", "assessment", "closed"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition ${
                    statusFilter === tab
                      ? "bg-white dark:bg-slate-700 text-[#0052CC] dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tab.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-12 text-center text-sm text-slate-400">
              Loading applications…
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] py-14 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No applications match this view</p>
              <p className="mt-1 text-xs text-slate-400">Add a role above to kick off monitoring.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm">
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredApps.map((app) => (
                  <li
                    key={app._id}
                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between transition duration-150 hover:bg-slate-50/80 dark:hover:bg-[#1E293B]/80"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <Link
                          href={`/dashboard/${app._id}`}
                          className="truncate text-sm font-bold text-[#0F172A] dark:text-white hover:text-[#0052CC] dark:hover:text-[#2684FF] transition"
                        >
                          {app.roleTitle}
                        </Link>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="truncate text-sm font-semibold text-[#64748B] dark:text-slate-400">
                          {app.companyName}
                        </span>
                        {app.jobUrl && (
                          <Link
                            href={`/browser?url=${encodeURIComponent(app.jobUrl)}`}
                            className="rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800 px-2 py-0.5 text-[10px] font-semibold text-[#0052CC] dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
                            title="Open in Browser Assist"
                          >
                            Browser Assist ↗
                          </Link>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {SOURCE_PLATFORM_LABELS[app.sourcePlatform] || app.sourcePlatform}
                        </span>
                        <span>·</span>
                        <span>Applied {formatDate(app.applicationDate)}</span>
                        {app.lastEmailAt && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
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
                        className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 disabled:opacity-50 transition ${
                          STATUS_STYLES[app.currentStatus] || "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {APPLICATION_STATUS_VALUES.map((v) => (
                          <option key={v} value={v} className="dark:bg-slate-900 dark:text-white">
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
          <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Autonomous Agent Decision Feed
                </h2>
                <p className="text-xs text-[#64748B]">
                  Transparent audit log showing what the agent evaluated and why.
                </p>
              </div>
              <Link href="/agent" className="text-xs font-semibold text-[#0052CC] hover:underline">
                View all logs →
              </Link>
            </div>

            <div className="space-y-2.5">
              {agentLogs.map((log) => {
                const app = log.applicationId || {};
                return (
                  <div
                    key={log._id}
                    className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          AGENT_DECISION_STYLES[log.decision] || "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {AGENT_DECISION_LABELS[log.decision] || log.decision}
                      </span>
                      <span className="font-bold text-[#0F172A] truncate">
                        {app.roleTitle ? `${app.roleTitle} @ ${app.companyName}` : "Application"}
                      </span>
                      <span className="text-[#64748B] truncate hidden md:inline">
                        — {log.reasoningSummary}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                      {formatTime(log.cycleAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  );
}

