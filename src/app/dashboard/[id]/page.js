"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { APPLICATION_STATUS_VALUES, SOURCE_PLATFORM_VALUES } from "@/lib/enums";
import {
  SOURCE_PLATFORM_LABELS,
  APPLICATION_STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/labels";
import { useRequireAuth } from "@/lib/useRequireAuth";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function StatusPill({ status }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        STATUS_STYLES[status] || "bg-slate-100 text-slate-700 border border-slate-200"
      }`}
    >
      {APPLICATION_STATUS_LABELS[status] || status}
    </span>
  );
}

export default function ApplicationDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { checking } = useRequireAuth();
  const [app, setApp] = useState(null);
  const [history, setHistory] = useState([]);
  const [emails, setEmails] = useState([]);
  const [outreachLogs, setOutreachLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load application");
      setApp(data.application);
      setHistory(data.history || []);
      setEmails(data.emails || []);
      setOutreachLogs(data.outreachLogs || []);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      await fetchDetail();
    })();
  }, [fetchDetail]);

  async function handleStatusChange(status) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      await fetchDetail();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    setEditForm({
      companyName: app.companyName || "",
      roleTitle: app.roleTitle || "",
      sourcePlatform: app.sourcePlatform || SOURCE_PLATFORM_VALUES[0],
      resumeVersion: app.resumeVersion || "",
      applicationDate: toDateInput(app.applicationDate),
      jobUrl: app.jobUrl || "",
      notes: app.notes || "",
    });
    setError("");
    setEditing(true);
  }

  function updateEdit(field) {
    return (e) => setEditForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleEditSave(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save changes");
      setEditing(false);
      await fetchDetail();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Delete this application and its status history? This can't be undone."
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      router.push("/dashboard");
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-slate-400 transition focus:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/15";
  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

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
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
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
              className="text-sm font-semibold text-[#0052CC] transition hover:underline"
            >
              ← Back to Pipeline
            </Link>
            <Link
              href="/profile"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Profile
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

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16 pt-8">
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : error && !app ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-14 text-center bg-white">
            <p className="text-sm font-semibold text-slate-700">{error}</p>
            <Link
              href="/dashboard"
              className="mt-2 inline-block text-xs font-bold text-[#0052CC] hover:underline"
            >
              Back to applications
            </Link>
          </div>
        ) : app ? (
          <>
            {/* Application header */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">
                    {app.roleTitle}
                  </h1>
                  <p className="mt-1 text-base font-semibold text-[#64748B]">{app.companyName}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <StatusPill status={app.currentStatus} />
                  {!editing && (
                    <>
                      <button
                        type="button"
                        onClick={startEdit}
                        disabled={busy}
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={busy}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editing ? (
                /* Edit form */
                <form
                  onSubmit={handleEditSave}
                  className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="companyName">
                        Company <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="companyName"
                        className={inputClass}
                        value={editForm.companyName}
                        onChange={updateEdit("companyName")}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="roleTitle">
                        Role <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="roleTitle"
                        className={inputClass}
                        value={editForm.roleTitle}
                        onChange={updateEdit("roleTitle")}
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
                        value={editForm.sourcePlatform}
                        onChange={updateEdit("sourcePlatform")}
                      >
                        {SOURCE_PLATFORM_VALUES.map((v) => (
                          <option key={v} value={v}>
                            {SOURCE_PLATFORM_LABELS[v]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="resumeVersion">
                        Résumé version
                      </label>
                      <input
                        id="resumeVersion"
                        className={inputClass}
                        value={editForm.resumeVersion}
                        onChange={updateEdit("resumeVersion")}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="applicationDate">
                        Applied on
                      </label>
                      <input
                        id="applicationDate"
                        type="date"
                        className={inputClass}
                        value={editForm.applicationDate}
                        onChange={updateEdit("applicationDate")}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="jobUrl">
                        Job link
                      </label>
                      <input
                        id="jobUrl"
                        type="url"
                        className={inputClass}
                        placeholder="https://…"
                        value={editForm.jobUrl}
                        onChange={updateEdit("jobUrl")}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass} htmlFor="notes">
                        Notes
                      </label>
                      <textarea
                        id="notes"
                        rows={3}
                        className={inputClass}
                        value={editForm.notes}
                        onChange={updateEdit("notes")}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0043A4] disabled:opacity-60"
                    >
                      {busy ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      disabled={busy}
                      className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <dl className="mt-6 grid gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-5 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold text-slate-400">Source Platform</dt>
                      <dd className="mt-0.5 text-sm font-bold text-[#0F172A]">
                        {SOURCE_PLATFORM_LABELS[app.sourcePlatform] ||
                          app.sourcePlatform}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-400">
                        Applied Date
                      </dt>
                      <dd className="mt-0.5 text-sm font-bold text-[#0F172A]">
                        {formatDate(app.applicationDate)}
                      </dd>
                    </div>
                    {app.resumeVersion && (
                      <div>
                        <dt className="text-xs font-semibold text-slate-400">
                          Résumé Version
                        </dt>
                        <dd className="mt-0.5 text-sm font-semibold text-[#0F172A]">
                          {app.resumeVersion}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs font-semibold text-slate-400">
                        Monitoring Status
                      </dt>
                      <dd className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#0F172A]">
                        {app.isOpen ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-emerald-800 font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Open — Active Tracking
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-slate-600 font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Closed
                          </span>
                        )}
                      </dd>
                    </div>
                    {app.jobUrl && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold text-slate-400">
                          Job Link
                        </dt>
                        <dd className="mt-0.5 truncate text-sm">
                          <a
                            href={app.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0052CC] font-semibold hover:underline"
                          >
                            {app.jobUrl}
                          </a>
                        </dd>
                      </div>
                    )}
                    {app.notes && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold text-slate-400">
                          Notes
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-wrap text-sm text-[#0F172A]">
                          {app.notes}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {/* Status control */}
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="status"
                      className="text-xs font-bold text-slate-600 uppercase tracking-wider"
                    >
                      Update Pipeline Status:
                    </label>
                    <select
                      id="status"
                      value={app.currentStatus}
                      disabled={saving}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0052CC]/25 disabled:opacity-50 ${
                        STATUS_STYLES[app.currentStatus] ||
                        "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {APPLICATION_STATUS_VALUES.map((v) => (
                        <option key={v} value={v}>
                          {APPLICATION_STATUS_LABELS[v]}
                        </option>
                      ))}
                    </select>
                    {saving && (
                      <span className="text-xs text-slate-400">Saving…</span>
                    )}
                  </div>
                </>
              )}
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-800">
                {error}
              </p>
            )}

            {/* Recruiter Emails Linked to this Application */}
            {emails.length > 0 && (
              <section className="mt-8">
                <h2 className="text-base font-bold text-[#0F172A]">
                  Linked Recruiter Emails ({emails.length})
                </h2>
                <ul className="mt-3 space-y-3">
                  {emails.map((m) => (
                    <li
                      key={m._id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#0F172A]">
                          {m.fromAddress}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDateTime(m.receivedAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-bold text-slate-800">
                        {m.subject}
                      </p>
                      {m.snippet && (
                        <p className="mt-1 text-xs text-[#64748B] line-clamp-2">
                          {m.snippet}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Follow-up Drafts & Outreach */}
            {outreachLogs.length > 0 && (
              <section className="mt-8">
                <h2 className="text-base font-bold text-[#0F172A]">
                  Follow-Up Outreach History ({outreachLogs.length})
                </h2>
                <ul className="mt-3 space-y-3">
                  {outreachLogs.map((log) => (
                    <li
                      key={log._id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-[#0052CC] capitalize">
                          Status: {log.status.replace("_", " ")}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-bold text-[#0F172A]">
                        {log.subject}
                      </p>
                      <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-700 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                        {log.finalText || log.draftText}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Timeline */}
            <section className="mt-8">
              <h2 className="text-base font-bold text-[#0F172A]">
                Status History Timeline
              </h2>
              {history.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
                  No status changes yet. Every change you or the agent make will
                  be logged here.
                </p>
              ) : (
                <ol className="mt-3 space-y-3">
                  {history.map((h) => (
                    <li
                      key={h._id}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-sm"
                    >
                      {h.previousStatus && (
                        <>
                          <StatusPill status={h.previousStatus} />
                          <span className="text-slate-400">→</span>
                        </>
                      )}
                      <StatusPill status={h.newStatus} />
                      <span className="ml-auto text-xs text-slate-400 font-medium">
                        by <span className="font-semibold text-slate-600">{h.changedBy}</span> · {formatDateTime(h.changedAt)}
                      </span>
                      {h.reason && (
                        <p className="w-full text-xs text-[#64748B] mt-1">
                          {h.reason}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

