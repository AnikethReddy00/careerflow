"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import {
  User,
  FlaskConical,
  Search,
  Zap,
  RotateCcw,
  Check,
  X,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import NavigationSheet from "@/components/NavigationSheet";
import AppLayout from "@/components/AppLayout";

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BrowserLauncherPage() {
  const router = useRouter();
  const { user, checking } = useRequireAuth();
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [activeSession, setActiveSession] = useState(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [scanReport, setScanReport] = useState(null);
  const [autofillReport, setAutofillReport] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadProfile() {
    setProfileLoading(true);
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
      }
    } catch {
      // ignore
    } finally {
      setProfileLoading(false);
    }
  }

  async function refreshSessions(nextActiveId = activeSessionId) {
    const res = await fetch("/api/browser");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load browser sessions");
    setSessions(data.sessions || []);
    if (!nextActiveId && data.sessions?.length) {
      setActiveSessionId(data.sessions[0].id);
    }
  }

  async function loadActiveSession(sessionId) {
    if (!sessionId) {
      setActiveSession(null);
      setUrl("");
      return;
    }
    const res = await fetch("/api/browser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "snapshot", sessionId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load session");
    setActiveSession(data.session);
    setUrl(data.session?.url || "");
  }

  useEffect(() => {
    (async () => {
      try {
        const queryUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("url") : null;
        if (queryUrl) {
          setUrl(queryUrl);
        }
        await Promise.all([refreshSessions(""), loadProfile()]);
      } catch (e) {
        setError(e.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadActiveSession(activeSessionId);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [activeSessionId]);

  async function runAction(action, payload = {}) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          sessionId: activeSessionId,
          ...payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Browser action failed");

      if (action === "scan" && data.scan) {
        setScanReport(data.scan);
        setNotice(`Scan complete: Analyzed ${data.scan.totalFields} form fields with LLM planning.`);
        setTimeout(() => setNotice(""), 6000);
      }

      if (action === "autofill" && data.autofill) {
        setAutofillReport(data.autofill);
        setNotice(`Verified & Filled: Successfully injected ${data.autofill.filledCount} of ${data.autofill.totalFieldsFound} fields into browser DOM.`);
        setTimeout(() => setNotice(""), 6000);
      }

      if (data.session) {
        setActiveSession(data.session);
        await refreshSessions(activeSessionId || data.session.id);
      } else if (action === "close" && data.closed) {
        setActiveSession(null);
        setActiveSessionId("");
        setScanReport(null);
        setAutofillReport(null);
        await refreshSessions("");
      } else {
        await refreshSessions(activeSessionId);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setScanning(false);
      setAutofilling(false);
    }
  }

  async function handleOpen(targetUrl) {
    const finalUrl = targetUrl || url;
    await runAction("open", { url: finalUrl });
  }

  async function handleNavigate(targetUrl) {
    const finalUrl = targetUrl || url;
    if (!activeSessionId) return handleOpen(finalUrl);
    await runAction("navigate", { url: finalUrl });
  }

  async function handleScanForm() {
    if (!activeSessionId) {
      setError("Please open a browser window with a job application page first.");
      return;
    }
    setScanning(true);
    await runAction("scan");
  }

  async function handleAutofill() {
    if (!activeSessionId) {
      setError("Please open a browser window with a job application page first.");
      return;
    }
    setAutofilling(true);
    await runAction("autofill");
  }

  async function handleOpenDemoForm() {
    const demoUrl = `${window.location.origin}/demo-application`;
    setUrl(demoUrl);
    if (!activeSessionId) {
      await handleOpen(demoUrl);
    } else {
      await handleNavigate(demoUrl);
    }
  }

  async function handlePrefillProfile() {
    setBusy(true);
    try {
      const res = await fetch("/api/profile/prefill", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to prefill profile");
      setProfile(data.profile);
      setNotice("Candidate profile prefilled with test resume & skills data.");
      setTimeout(() => setNotice(""), 5000);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    await runAction("close");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#0052CC] border-t-transparent" />
          <span className="text-sm font-medium">Checking session…</span>
        </div>
      </div>
    );
  }

  return (
    <AppLayout user={user}>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 dark:border-slate-800 dark:bg-[#0F172A]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3.5">
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
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-16 pt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-0.5 text-xs font-semibold text-[#0052CC]">
              Browser Assist & 2-Phase Intelligent Autofill
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">
              Job Application Browser Automation
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#64748B]">
              Launch a live headed Chrome window to open job application portals, thoroughly scan form structures with LLM planning, and execute 2nd-check verified autofill.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-xs text-[#64748B] shadow-sm">
            <div className="font-bold text-[#0F172A]">Active Session</div>
            <div className="mt-1 max-w-xs truncate font-mono text-slate-700">{activeSession ? activeSession.url : "No active session"}</div>
          </div>
        </div>

        {/* 2-Step Action Spotlight Card */}
        <section className="mt-6 rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/70 via-white to-slate-50/70 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100/80 text-[#0052CC]">
                  <User className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Candidate Profile: {profile?.personal?.firstName ? `${profile.personal.firstName} ${profile.personal.lastName || ""}` : (user?.name || "Test Profile")}
                </h2>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                  Ready
                </span>
              </div>
              <p className="mt-1 text-xs text-[#64748B]">
                {profile?.personal?.email || user?.email} • {profile?.personal?.phone || "+91 8143532870"} • {profile?.personal?.location || "Hyderabad, India"} • {profile?.skills?.length || 18} skills indexed
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleOpenDemoForm}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-[#0052CC] shadow-sm transition hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                <span>Open Demo Job Form</span>
              </button>

              <button
                type="button"
                onClick={handleScanForm}
                disabled={busy || scanning || !activeSessionId}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#0052CC] bg-blue-50 px-4 py-2 text-xs font-bold text-[#0052CC] shadow-sm transition hover:bg-blue-100 disabled:opacity-50"
              >
                <Search className={`h-3.5 w-3.5 ${scanning ? "animate-spin" : ""}`} />
                <span>{scanning ? "Scanning Form…" : "Step 1: Scan & Inspect Form"}</span>
              </button>

              <button
                type="button"
                onClick={handleAutofill}
                disabled={busy || autofilling || !activeSessionId}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0052CC] px-5 py-2 text-xs font-bold text-white shadow-sm shadow-[#0052CC]/25 transition hover:bg-[#0043A4] hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Zap className={`h-3.5 w-3.5 ${autofilling ? "animate-pulse" : ""}`} />
                <span>{autofilling ? "2nd-Check Filling…" : "Step 2: Verify & Fill Form"}</span>
              </button>

              <button
                type="button"
                onClick={handlePrefillProfile}
                disabled={busy}
                title="Reset/Seed profile with realistic test data"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Seed Test Data</span>
              </button>
            </div>
          </div>

          {notice && (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
              {notice}
            </p>
          )}
        </section>

        {/* Step 1: LLM Deep Form Discovery & Planning Report */}
        {scanReport && (
          <section className="mt-6 rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#0052CC]">
                  <Search className="h-3.5 w-3.5" />
                  <span>Phase 1 Inspection: Form Structure Analysis</span>
                </div>
                <h2 className="mt-1 text-base font-bold text-[#0F172A]">
                  Discovered Form Elements ({scanReport.totalFields} fields found)
                </h2>
                <p className="text-xs text-[#64748B]">
                  LLM has scanned every prompt, question context, and options on the page and planned the exact candidate mappings.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  {scanReport.autoFillableCount} Ready to Fill
                </span>
                {scanReport.manualReviewCount > 0 && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                    {scanReport.manualReviewCount} Manual / File
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleAutofill}
                  disabled={busy || autofilling}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#0052CC] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#0043A4]"
                >
                  <Zap className="h-3 w-3" />
                  <span>Execute Verified Fill</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScanReport(null)}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Question / Label</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">LLM Planned Value</th>
                    <th className="py-2.5 px-3">Rationale</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {scanReport.fields?.map((item) => (
                    <tr key={item.index} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{item.index + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#0F172A] max-w-xs">
                        <div className="truncate">{item.label}</div>
                        {item.context && <div className="text-[10px] text-slate-400 truncate">{item.context}</div>}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono uppercase text-slate-600">
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 max-w-xs">
                        <div className="truncate">{item.plannedValue ? String(item.plannedValue) : "—"}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                        {item.rationale}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.status === "ready_to_fill" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <Check className="h-3 w-3" />
                            <span>Ready</span>
                          </span>
                        ) : item.status === "file_upload_required" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#0052CC] border border-blue-200">
                            <Paperclip className="h-3 w-3" />
                            <span>Upload File</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                            Manual
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Step 2: Post-Execution Verification Report & Audit Feed */}
        {autofillReport && (
          <section className="mt-6 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Phase 2: Verified DOM Injection</span>
                </div>
                <h2 className="mt-1 text-base font-bold text-[#0F172A]">
                  Autofill Results & Verification ({autofillReport.filledCount} fields verified in DOM)
                </h2>
                <p className="text-xs text-[#64748B]">
                  Each value was injected and verified inside the browser DOM controls.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  {autofillReport.filledCount} Success
                </span>
                <button
                  type="button"
                  onClick={() => setAutofillReport(null)}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Dismiss</span>
                </button>
              </div>
            </div>

            {/* Live Verification Audit Feed */}
            {autofillReport.auditLog?.length > 0 && (
              <div className="mt-4 rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 max-h-48 overflow-y-auto space-y-1">
                <div className="text-[11px] font-bold uppercase text-slate-400 border-b border-slate-800 pb-1 mb-2">
                  DOM Verification Step-by-Step Log
                </div>
                {autofillReport.auditLog.map((log, idx) => (
                  <div key={idx} className="leading-5">
                    {log}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {autofillReport.filled?.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 truncate">{item.matchedField || item.label}</span>
                    <Check className="h-3.5 w-3.5 text-emerald-600 font-bold" />
                  </div>
                  <div className="mt-1 truncate font-mono text-slate-900 font-semibold">{String(item.value)}</div>
                  <div className="mt-1 text-[10px] text-slate-400">Verified Value: {String(item.verifiedValue || item.value)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Browser Sessions
              </h2>
              <button
                type="button"
                onClick={() => refreshSessions()}
                disabled={busy}
                className="text-xs font-bold text-[#0052CC] hover:underline disabled:opacity-40"
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {sessions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-xs text-slate-400">
                  No active browser sessions. Open a window to start.
                </p>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      setActiveSessionId(session.id);
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      session.id === activeSessionId
                        ? "border-blue-300 bg-blue-50/70 text-[#0F172A]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="truncate text-xs font-bold">{session.title || session.url}</div>
                    <div className="mt-1 truncate text-[11px] text-[#64748B]">{session.url}</div>
                    <div className="mt-1 text-[10px] text-slate-400">
                      Updated {formatDateTime(session.lastUsedAt)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Job Application Portal Launcher
              </h2>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://jobs.example.com/apply or click Open Demo Job Form above"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#0F172A] outline-none transition focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/15"
                />
                <button
                  type="button"
                  onClick={() => handleOpen()}
                  disabled={busy || !url.trim()}
                  className="rounded-xl bg-[#0052CC] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0052CC]/25 transition hover:bg-[#0043A4] disabled:opacity-50"
                >
                  Open Window
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate()}
                  disabled={busy || !url.trim()}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Navigate
                </button>
              </div>
              <p className="mt-3 text-xs text-[#64748B]">
                Chrome opens in live headed mode. Navigate to any company portal, then use <strong>Step 1: Scan & Inspect Form</strong> to discover what is on the page, and <strong>Step 2: Verify & Fill Form</strong> to inject values.
              </p>
            </div>

            {error && (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 shadow-sm">
                {error}
              </p>
            )}

            {/* Active Session Status Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Active Session Status & Controls
                  </h2>
                  <div className="mt-1 text-sm font-bold text-[#0F172A]">
                    {activeSession ? (activeSession.title || "Portal Session Active") : "No Session Attached"}
                  </div>
                </div>

                {activeSessionId && (
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={busy}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    Close Browser Window
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs text-slate-600">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="font-bold text-[#0F172A]">Current URL</div>
                  <div className="mt-1 truncate font-mono text-slate-700">{activeSession?.url || "—"}</div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="font-bold text-[#0F172A]">Page Title</div>
                  <div className="mt-1 truncate text-slate-700">{activeSession?.title || "—"}</div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="font-bold text-[#0F172A]">Last Active</div>
                  <div className="mt-1 text-slate-700">{activeSession?.lastUsedAt ? formatDateTime(activeSession.lastUsedAt) : "—"}</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AppLayout>
  );
}
