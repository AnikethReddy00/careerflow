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

// Stored dates are ISO; a <input type="date"> wants local yyyy-mm-dd.
function toDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function StatusPill({ status }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] || "bg-zinc-100 text-zinc-700"
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false); // status change
  const [busy, setBusy] = useState(false); // edit save / delete
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Memoized on id so it's a stable effect dependency. No synchronous setState
  // (everything runs after the first await), which keeps React 19's
  // set-state-in-effect rule happy.
  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load application");
      setApp(data.application);
      setHistory(data.history || []);
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
      // Refetch so the app card and the timeline both reflect the new entry.
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
    "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const labelClass = "mb-1 block text-xs font-medium text-zinc-600";

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
        {loading ? (
          <p className="py-10 text-center text-sm text-zinc-400">Loading…</p>
        ) : error && !app ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 py-14 text-center">
            <p className="text-sm font-medium text-zinc-600">{error}</p>
            <Link
              href="/dashboard"
              className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline"
            >
              Back to applications
            </Link>
          </div>
        ) : app ? (
          <>
            {/* Application header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {app.roleTitle}
                </h1>
                <p className="mt-1 text-zinc-600">{app.companyName}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={app.currentStatus} />
                {!editing && (
                  <>
                    <button
                      type="button"
                      onClick={startEdit}
                      disabled={busy}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={busy}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
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
                className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-5"
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
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
                  >
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    disabled={busy}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <dl className="mt-6 grid gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-5 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-zinc-400">Source</dt>
                    <dd className="mt-0.5 text-sm text-zinc-800">
                      {SOURCE_PLATFORM_LABELS[app.sourcePlatform] ||
                        app.sourcePlatform}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-400">
                      Applied on
                    </dt>
                    <dd className="mt-0.5 text-sm text-zinc-800">
                      {formatDate(app.applicationDate)}
                    </dd>
                  </div>
                  {app.resumeVersion && (
                    <div>
                      <dt className="text-xs font-medium text-zinc-400">
                        Résumé version
                      </dt>
                      <dd className="mt-0.5 text-sm text-zinc-800">
                        {app.resumeVersion}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-medium text-zinc-400">
                      Monitoring
                    </dt>
                    <dd className="mt-0.5 text-sm text-zinc-800">
                      {app.isOpen ? "Open — being tracked" : "Closed"}
                    </dd>
                  </div>
                  {app.jobUrl && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium text-zinc-400">
                        Job link
                      </dt>
                      <dd className="mt-0.5 truncate text-sm">
                        <a
                          href={app.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          {app.jobUrl}
                        </a>
                      </dd>
                    </div>
                  )}
                  {app.notes && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium text-zinc-400">
                        Notes
                      </dt>
                      <dd className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-800">
                        {app.notes}
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Status control */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="status"
                    className="text-sm font-medium text-zinc-600"
                  >
                    Change status
                  </label>
                  <select
                    id="status"
                    value={app.currentStatus}
                    disabled={saving}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`cursor-pointer rounded-lg border-0 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 ${
                      STATUS_STYLES[app.currentStatus] ||
                      "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {APPLICATION_STATUS_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {APPLICATION_STATUS_LABELS[v]}
                      </option>
                    ))}
                  </select>
                  {saving && (
                    <span className="text-xs text-zinc-400">Saving…</span>
                  )}
                </div>
              </>
            )}

            {error && (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}

            {/* Timeline */}
            <section className="mt-10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Status history
              </h2>
              {history.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400">
                  No status changes yet. Every change you or the agent make will
                  be logged here.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {history.map((h) => (
                    <li
                      key={h._id}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-zinc-100 bg-white px-4 py-3"
                    >
                      {h.previousStatus && (
                        <>
                          <StatusPill status={h.previousStatus} />
                          <span className="text-zinc-400">→</span>
                        </>
                      )}
                      <StatusPill status={h.newStatus} />
                      <span className="ml-auto text-xs text-zinc-400">
                        by {h.changedBy} · {formatDateTime(h.changedAt)}
                      </span>
                      {h.reason && (
                        <p className="w-full text-xs text-zinc-500">
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
