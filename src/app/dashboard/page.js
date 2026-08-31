"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SOURCE_PLATFORM_VALUES, APPLICATION_STATUS_VALUES } from "@/lib/enums";
import { useRequireAuth } from "@/lib/useRequireAuth";
import {
  SOURCE_PLATFORM_LABELS,
  APPLICATION_STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/labels";

const EMPTY_FORM = {
  companyName: "",
  roleTitle: "",
  sourcePlatform: "linkedin",
  resumeVersion: "",
  applicationDate: "",
  // Filled by the AI auto-fill flow; carried through to the create request.
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

export default function Dashboard() {
  const router = useRouter();
  const { user, checking } = useRequireAuth();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [savingId, setSavingId] = useState(null);
  // AI auto-fill: paste a job post -> local model -> pre-filled form.
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");

  // Load the list on mount. The cancelled guard skips the state update if the
  // component unmounts first (and dedupes React 19 StrictMode's double-invoke).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/applications");
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to load applications");
        if (!cancelled) setApps(data.applications || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
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
      // Prepend the new one so it shows instantly, then reset the form.
      setApps((prev) => [data.application, ...prev]);
      setForm(EMPTY_FORM);
      setPasteText("");
      setShowPaste(false);
      setExtractError("");
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
      // Swap the updated application into the list in place.
      setApps((prev) => prev.map((a) => (a._id === id ? data.application : a)));
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  }

  // Send the pasted job post to the local model and pre-fill the form with what
  // it extracts. Non-destructive: the user can edit every field before adding.
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
    } catch (e) {
      setExtractError(e.message);
    } finally {
      setExtracting(false);
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
      {/* Header */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
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
            href="/agent"
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Agent
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16">
        <div className="pt-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Applications
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Log every role you apply to. The agent monitors the open ones.
          </p>
        </div>

        {/* AI auto-fill from a pasted job post */}
        <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-indigo-900">
                Auto-fill from a job post
              </h2>
              <p className="mt-0.5 text-xs text-indigo-700/70">
                Paste a listing — a local AI model on your machine fills the form.
                Nothing leaves your computer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPaste((v) => !v)}
              className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
            >
              {showPaste ? "Hide" : "Paste job post"}
            </button>
          </div>

          {showPaste && (
            <div className="mt-4">
              <textarea
                rows={6}
                className={inputClass}
                placeholder="Paste the full job description here…"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={extracting || pasteText.trim().length < 40}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {extracting ? "Reading…" : "Extract with AI"}
                </button>
                {extractError && (
                  <span className="text-xs text-rose-600">{extractError}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add form */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="companyName">
                Company <span className="text-rose-500">*</span>
              </label>
              <input
                id="companyName"
                className={inputClass}
                placeholder="Acme Inc."
                value={form.companyName}
                onChange={update("companyName")}
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
                placeholder="Software Engineer"
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
              <label className={labelClass} htmlFor="resumeVersion">
                Resume version
              </label>
              <input
                id="resumeVersion"
                className={inputClass}
                placeholder="e.g. backend-v2"
                value={form.resumeVersion}
                onChange={update("resumeVersion")}
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
                value={form.applicationDate}
                onChange={update("applicationDate")}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
              >
                {submitting ? "Adding…" : "Add application"}
              </button>
            </div>
          </div>

          {(form.jobUrl || form.notes) && (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-xs text-emerald-900">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  Captured from the post — saved with the application
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, jobUrl: "", notes: "" }))
                  }
                  className="text-emerald-700 underline hover:text-emerald-900"
                >
                  Clear
                </button>
              </div>
              {form.jobUrl && (
                <p className="mt-1 truncate">Link: {form.jobUrl}</p>
              )}
              {form.notes && (
                <p className="mt-1 whitespace-pre-wrap text-emerald-800">
                  {form.notes}
                </p>
              )}
            </div>
          )}
        </form>

        {error && (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        {/* List */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Your applications
            </h2>
            {!loading && (
              <span className="text-xs text-zinc-400">
                {apps.length} {apps.length === 1 ? "role" : "roles"}
              </span>
            )}
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-zinc-400">Loading…</p>
          ) : apps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 py-14 text-center">
              <p className="text-sm font-medium text-zinc-600">
                No applications yet
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Add your first one above to get started.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-100">
              {apps.map((app) => (
                <li
                  key={app._id}
                  className="flex items-center justify-between gap-4 bg-white px-5 py-4"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/${app._id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <span className="truncate text-sm font-semibold text-zinc-900">
                        {app.roleTitle}
                      </span>
                      <span className="text-zinc-300">·</span>
                      <span className="truncate text-sm text-zinc-600">
                        {app.companyName}
                      </span>
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                      <span>
                        {SOURCE_PLATFORM_LABELS[app.sourcePlatform] ||
                          app.sourcePlatform}
                      </span>
                      <span>·</span>
                      <span>Applied {formatDate(app.applicationDate)}</span>
                      {app.resumeVersion && (
                        <>
                          <span>·</span>
                          <span>{app.resumeVersion}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <select
                    aria-label="Change status"
                    value={app.currentStatus}
                    disabled={savingId === app._id}
                    onChange={(e) =>
                      handleStatusChange(app._id, e.target.value)
                    }
                    className={`shrink-0 cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 ${
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
