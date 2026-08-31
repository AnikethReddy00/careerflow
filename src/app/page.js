"use client";

import { useState } from "react";
import Link from "next/link";
import PermissionsModal from "@/components/PermissionsModal";

// The four steps of the agent's reasoning loop — the core idea of the project.
const LOOP = [
  { k: "Observe", d: "Reads each open application and scans your inbox for new recruiter mail." },
  { k: "Reason", d: "Weighs status, days of silence, and any new email against your rules." },
  { k: "Decide", d: "Update status, draft a follow-up, escalate to you — or do nothing." },
  { k: "Act", d: "Applies the change, and sends or queues the email based on your settings." },
];

export default function Home() {
  // Popped on load, per the plan — the first thing a new user does is connect Gmail.
  const [modalOpen, setModalOpen] = useState(true);
  // Placeholder until real OAuth lands; "Grant access" flips this for now.
  const [connected, setConnected] = useState(false);

  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            C
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            CareerFlow<span className="text-indigo-600"> AI</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
          >
            Dashboard
          </Link>
          <Link
            href="/agent"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
          >
            Agent
          </Link>
          <Link
            href="/browser"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
          >
            Browser
          </Link>
          <Link
            href="/login"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-lg border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            {connected ? "Gmail connected ✓" : "Connect Gmail"}
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
        <section className="pt-16 pb-14 sm:pt-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Autonomous career agent
          </div>

          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            Your only job is to{" "}
            <span className="text-indigo-600">apply</span>.
            <br className="hidden sm:block" />
            The agent tracks the rest.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600">
            CareerFlow watches every application you submit, reads your inbox for
            recruiter replies, updates each status on its own, and drafts
            follow-ups when a role goes quiet — running on a schedule, without
            you pressing a button.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Open dashboard →
            </Link>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-lg border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              {connected ? "Gmail connected ✓" : "Connect Gmail"}
            </button>
          </div>
        </section>

        {/* The reasoning loop */}
        <section className="border-t border-zinc-100 py-14">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            How the agent thinks
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LOOP.map((step, i) => (
              <div
                key={step.k}
                className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-5"
              >
                <div className="flex items-center gap-2 text-indigo-600">
                  <span className="text-xs font-semibold tabular-nums">
                    0{i + 1}
                  </span>
                  <span className="h-px flex-1 bg-indigo-100" />
                </div>
                <div className="mt-3 text-base font-semibold tracking-tight">
                  {step.k}
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-500">
                  {step.d}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            This loop repeats for every application, every cycle — and each pass
            is logged, including the times it decides to do nothing.
          </p>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 py-8 text-xs text-zinc-400">
        CareerFlow AI — semester project · full-stack + agentic AI
      </footer>

      <PermissionsModal
        open={modalOpen}
        onGrant={() => {
          setConnected(true);
          setModalOpen(false);
        }}
        onDismiss={() => setModalOpen(false)}
      />
    </div>
  );
}
