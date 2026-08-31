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
      <div className="flex flex-1 items-center justify-center bg-white text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            C
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            CareerFlow<span className="text-indigo-600"> AI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800">
            Applications
          </Link>
          <Link href="/agent" className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800">
            Agent
          </Link>
          {user?.email && <span className="hidden text-sm text-zinc-400 sm:inline">{user.email}</span>}
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Log out
          </button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-16 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              Browser launcher
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Launch a real Chrome window, use it directly, then run JS
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Open a URL and a separate headed browser window appears on your desktop.
              Use your normal mouse and keyboard in that window. Come back here only
              when you want to run JavaScript against the live page.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 text-xs text-zinc-500">
            <div className="font-medium text-zinc-700">Current session</div>
            <div className="mt-1 break-all">{activeSession ? activeSession.url : "No session open"}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Sessions
              </h2>
              <button
                type="button"
                onClick={() => refreshSessions()}
                disabled={busy}
                className="text-xs font-medium text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                Refresh list
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {sessions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-3 py-4 text-sm text-zinc-400">
                  No browser sessions yet.
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
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      session.id === activeSessionId
                        ? "border-indigo-200 bg-indigo-50 text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="truncate text-sm font-medium">{session.title || session.url}</div>
                    <div className="mt-1 truncate text-xs text-zinc-500">{session.url}</div>
                    <div className="mt-1 text-[11px] text-zinc-400">
                      Updated {formatDateTime(session.lastUsedAt)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/job-posting"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={handleOpen}
                  disabled={busy || !url.trim()}
                  className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Open window
                </button>
                <button
                  type="button"
                  onClick={handleNavigate}
                  disabled={busy || !url.trim()}
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Navigate
                </button>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                After the window opens, switch to that Chrome window and interact
                with it normally. Use this page only to open the site and run JS.
              </p>
            </div>

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                    JavaScript
                  </h2>
                  <span className="text-xs text-zinc-400">
                    Active session: {activeSessionId ? "yes" : "no"}
                  </span>
                </div>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  rows={18}
                  spellCheck="false"
                  className="mt-3 w-full rounded-2xl border border-zinc-200 bg-zinc-950 px-4 py-3 font-mono text-[13px] leading-6 text-zinc-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleEvaluate}
                  disabled={busy || !activeSessionId || !script.trim()}
                  className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Run JS
                </button>
                <button
                  type="button"
                  onClick={loadMercariInspector}
                  className="rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
                >
                  Load form inspector
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                    disabled={busy || !activeSessionId}
                    className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Close window
                  </button>
                  <button
                    type="button"
                    onClick={() => setScript(DEFAULT_SCRIPT)}
                    className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Reset snippet
                  </button>
                </div>
              </div>
              {copyNotice && (
                <p className="mt-2 text-xs text-emerald-700">{copyNotice}</p>
              )}

              <div className="space-y-6">
                <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                    Result
                  </h2>
                  <pre className="mt-3 max-h-[320px] overflow-auto rounded-2xl bg-zinc-950 p-4 text-[12.5px] leading-6 text-zinc-100">
                    {result ? JSON.stringify(result, null, 2) : "Run JavaScript to see the returned value here."}
                  </pre>
                </div>

                <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                    Session
                  </h2>
                  <div className="mt-3 space-y-2 text-sm text-zinc-600">
                    <div>
                      <span className="font-medium text-zinc-800">Title:</span>{" "}
                      {activeSession?.title || "—"}
                    </div>
                    <div>
                      <span className="font-medium text-zinc-800">URL:</span>{" "}
                      {activeSession?.url || "—"}
                    </div>
                    <div>
                      <span className="font-medium text-zinc-800">Updated:</span>{" "}
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
