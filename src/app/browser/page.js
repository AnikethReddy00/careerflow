"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";

const DEFAULT_SCRIPT = `const clean = (value) => String(value || "").replace(/\\s+/g, " ").trim();
const visible = (el) => {
  if (!el) return false;
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
};
const labelTextFor = (el) => {
  if (!el) return "";
  const byId = el.id ? document.querySelector(\`label[for="\${CSS.escape(el.id)}"]\`) : null;
  if (byId) return clean(byId.textContent);
  const wrappingLabel = el.closest("label");
  if (wrappingLabel) return clean(wrappingLabel.textContent);
  const aria = clean(el.getAttribute("aria-label"));
  if (aria) return aria;
  const title = clean(el.getAttribute("title"));
  if (title) return title;
  const placeholder = clean(el.getAttribute("placeholder"));
  if (placeholder) return placeholder;
  return clean(el.name || el.id || el.type || el.tagName);
};
const optionText = (opt) => ({
  label: clean(opt.textContent),
  value: String(opt.value || ""),
  selected: !!opt.selected,
});
const controls = [...document.querySelectorAll("input, select, textarea")]
  .filter(visible)
  .map((el) => {
    const type = (el.type || el.tagName).toLowerCase();
    const base = {
      type,
      label: labelTextFor(el),
      required: !!el.required,
      name: el.name || "",
      id: el.id || "",
      placeholder: clean(el.placeholder || ""),
    };

    if (el.tagName === "SELECT") {
      return {
        ...base,
        kind: "select",
        multiple: !!el.multiple,
        options: [...el.options].map(optionText),
      };
    }

    if (type === "radio") {
      return {
        ...base,
        kind: "radio",
        value: String(el.value || ""),
        checked: !!el.checked,
      };
    }

    if (type === "checkbox") {
      return {
        ...base,
        kind: "checkbox",
        value: String(el.value || ""),
        checked: !!el.checked,
      };
    }

    if (type === "file") {
      return {
        ...base,
        kind: "file",
        accept: clean(el.accept || ""),
      };
    }

    return {
      ...base,
      kind: el.tagName.toLowerCase() === "textarea" ? "textarea" : "input",
      value: clean(el.value || ""),
    };
  });

const groupedRadios = Object.values(
  controls
    .filter((item) => item.kind === "radio")
    .reduce((acc, item) => {
      const key = item.name || item.label || item.id;
      if (!acc[key]) {
        acc[key] = {
          kind: "radio-group",
          label: item.label,
          name: item.name,
          required: item.required,
          options: [],
        };
      }
      acc[key].options.push({
        label: item.label,
        value: item.value,
        checked: item.checked,
      });
      return acc;
    }, {})
);

const groups = [
  ...groupedRadios,
  ...controls.filter((item) => item.kind !== "radio"),
];

return {
  title: document.title,
  url: location.href,
  headings: [...document.querySelectorAll("h1, h2, h3")]
    .filter(visible)
    .map((el) => clean(el.textContent))
    .filter(Boolean),
  formFields: groups,
};`;

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
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copyNotice, setCopyNotice] = useState("");

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
        await refreshSessions("");
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
      if (action === "evaluate") {
        setResult(null);
      }
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

      if (data.session) {
        setActiveSession(data.session);
        if (action === "evaluate") {
          setResult(data.session.result ?? null);
        }
        await refreshSessions(activeSessionId || data.session.id);
      } else if (action === "close" && data.closed) {
        setActiveSession(null);
        setActiveSessionId("");
        setResult(null);
        await refreshSessions("");
      } else {
        await refreshSessions(activeSessionId);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleOpen() {
    await runAction("open", { url });
  }

  async function handleNavigate() {
    if (!activeSessionId) return handleOpen();
    await runAction("navigate", { url });
  }

  async function handleEvaluate() {
    await runAction("evaluate", { script });
  }

  function loadMercariInspector() {
    setScript(DEFAULT_SCRIPT);
    setCopyNotice("Loaded a form inspector script.");
    window.clearTimeout(loadMercariInspector._t);
    loadMercariInspector._t = window.setTimeout(() => setCopyNotice(""), 2000);
  }

  async function handleClose() {
    await runAction("close");
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
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0052CC] text-sm font-bold text-white shadow-sm shadow-[#0052CC]/25">
              C
            </span>
            <span className="text-base font-bold tracking-tight text-[#0F172A]">
              CareerFlow<span className="text-[#0052CC]"> AI</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/dashboard" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/profile" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900">
              Profile
            </Link>
            <Link href="/agent" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900">
              Agent Logs
            </Link>
            <Link href="/browser" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#0052CC] bg-blue-50/80">
              Browser
            </Link>
            {user?.email && <span className="hidden text-xs font-mono text-slate-400 sm:inline">{user.email}</span>}
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

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-16 pt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-0.5 text-xs font-semibold text-[#0052CC]">
              Browser Assist Automation
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">
              Interactive Browser Automation & Inspector
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#64748B]">
              Launch a live headed Chrome window on your desktop to inspect job portals, extract forms, and execute custom automation scripts.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-xs text-[#64748B] shadow-sm">
            <div className="font-bold text-[#0F172A]">Active Session</div>
            <div className="mt-1 break-all font-mono text-slate-700">{activeSession ? activeSession.url : "No active session"}</div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Sessions
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
                  No active browser sessions.
                </p>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setResult(null);
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
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/job-posting"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#0F172A] outline-none transition focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/15"
                />
                <button
                  type="button"
                  onClick={handleOpen}
                  disabled={busy || !url.trim()}
                  className="rounded-xl bg-[#0052CC] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0052CC]/25 transition hover:bg-[#0043A4] disabled:opacity-50"
                >
                  Open Window
                </button>
                <button
                  type="button"
                  onClick={handleNavigate}
                  disabled={busy || !url.trim()}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Navigate
                </button>
              </div>
              <p className="mt-3 text-xs text-[#64748B]">
                After the window opens, interact with it directly. Run JavaScript scripts against the active DOM below.
              </p>
            </div>

            {error && (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 shadow-sm">
                {error}
              </p>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    JavaScript Automation Script
                  </h2>
                  <span className="text-xs font-medium text-slate-400">
                    Active: {activeSessionId ? "Yes" : "No"}
                  </span>
                </div>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  rows={16}
                  spellCheck="false"
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-xs leading-5 text-slate-100 outline-none transition focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/15"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleEvaluate}
                    disabled={busy || !activeSessionId || !script.trim()}
                    className="rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0043A4] disabled:opacity-50"
                  >
                    Run JS Script
                  </button>
                  <button
                    type="button"
                    onClick={loadMercariInspector}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-[#0052CC] hover:bg-blue-100"
                  >
                    Load Form Inspector
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={busy || !activeSessionId}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    Close Window
                  </button>
                  <button
                    type="button"
                    onClick={() => setScript(DEFAULT_SCRIPT)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Reset
                  </button>
                </div>
                {copyNotice && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">{copyNotice}</p>
                )}
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Execution Result
                  </h2>
                  <pre className="mt-3 max-h-[300px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs font-mono leading-5 text-slate-100">
                    {result ? JSON.stringify(result, null, 2) : "Run JavaScript to see the structured output here."}
                  </pre>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Session Meta
                  </h2>
                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    <div>
                      <span className="font-bold text-[#0F172A]">Title:</span>{" "}
                      {activeSession?.title || "—"}
                    </div>
                    <div>
                      <span className="font-bold text-[#0F172A]">URL:</span>{" "}
                      <span className="font-mono">{activeSession?.url || "—"}</span>
                    </div>
                    <div>
                      <span className="font-bold text-[#0F172A]">Updated:</span>{" "}
                      {activeSession?.lastUsedAt ? formatDateTime(activeSession.lastUsedAt) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

