"use client";

import { useState } from "react";
import Link from "next/link";
import PermissionsModal from "@/components/PermissionsModal";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowRight, Check, BrainCircuit } from "lucide-react";

// The four steps of the agent's reasoning loop — the core idea of the project.
const LOOP = [
  {
    step: "01",
    title: "Observe & Ingest",
    desc: "Reads open pipeline roles, auto-extracts job descriptions, and continuously scans inbox for recruiter messages.",
    badge: "Inbox & Feed",
  },
  {
    step: "02",
    title: "Reason & Classify",
    desc: "Groq LLM classifies emails into interviews, assessments, or rejections and calculates days of silence against SLAs.",
    badge: "AI Evaluation",
  },
  {
    step: "03",
    title: "Decide & Plan",
    desc: "Determines whether to update status, generate personalized follow-up outreach, or escalate attention.",
    badge: "Decision Engine",
  },
  {
    step: "04",
    title: "Act & Sync",
    desc: "Applies pipeline updates, queues high-impact follow-ups for 1-click approval, and logs transparent reasoning.",
    badge: "Automated Action",
  },
];

const HIGHLIGHTS = [
  { label: "Ultra-Fast Groq AI", value: "Sub-Second", desc: "Instant classification & extraction" },
  { label: "Inbox Automation", value: "100%", desc: "Direct Gmail OAuth triage" },
  { label: "Candidate Fit", value: "Smart Gap Analysis", desc: "Resume vs JD skills alignment" },
  { label: "Pipeline Precision", value: "Autonomous", desc: "Zero manual spreadsheet tracking" },
];

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [connected, setConnected] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Background ambient glow effect like JobSync */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-[#E6F0FF]/60 via-[#F0F6FF]/30 to-transparent" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0052CC] text-sm font-bold text-white shadow-sm shadow-[#0052CC]/25">
              C
            </span>
            <span className="text-base font-bold tracking-tight text-[#0F172A]">
              CareerFlow<span className="text-[#0052CC]"> AI</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/dashboard"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Dashboard
            </Link>
            <Link
              href="/jobs"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Recommended Jobs
            </Link>
            <Link
              href="/intelligence"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Intelligence
            </Link>
            <Link
              href="/profile"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Profile
            </Link>
            <Link
              href="/browser"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Browser Assist
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl bg-[#0052CC] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-[#0052CC]/25 transition hover:bg-[#0043A4]"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-6">
        <section className="pt-16 pb-14 text-center sm:pt-24 sm:pb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3.5 py-1 text-xs font-semibold text-[#0052CC]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Autonomous Agentic Career Platform
          </div>

          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-5xl sm:leading-[1.15]">
            Your only job is to <span className="text-[#0052CC]">apply</span>.<br />
            The agent coordinates the rest.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm sm:text-base leading-relaxed text-[#64748B]">
            CareerFlow autonomously monitors every job submission, reads your inbox for recruiter replies, classifies interview invites, updates application statuses, and drafts personalized follow-up outreach.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0052CC] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#0052CC]/25 transition hover:bg-[#0043A4] hover:-translate-y-0.5"
            >
              <span>Open Command Center</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              {connected ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Gmail Connected</span>
                </>
              ) : (
                <span>Connect Gmail</span>
              )}
            </button>
          </div>

          {/* Highlights Row */}
          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {HIGHLIGHTS.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm text-left transition hover:border-blue-200 hover:shadow-md"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  {item.label}
                </div>
                <div className="mt-1.5 text-xl font-extrabold text-[#0052CC]">
                  {item.value}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The 4-step Reasoning Loop Section */}
        <section className="border-t border-slate-200/80 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs font-bold uppercase tracking-wider text-[#0052CC]">
              Agentic Loop Architecture
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
              How the Autonomous Reasoner Operates
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#64748B]">
              Every application is evaluated cyclically through a 4-stage cognitive loop, ensuring no opportunity goes cold.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LOOP.map((step) => (
              <div
                key={step.step}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 font-mono text-xs font-bold text-[#0052CC]">
                      {step.step}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {step.badge}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-[#0F172A] group-hover:text-[#0052CC] transition">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#64748B]">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Gap Analyzer & Candidate Profile Spotlight */}
        <section className="mb-16 rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 p-8 sm:p-10 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/70 px-3 py-0.5 text-xs font-semibold text-[#0052CC]">
                <BrainCircuit className="h-3.5 w-3.5" />
                <span>AI Resume & JD Gap Analyzer</span>
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
                Know Exactly What You&apos;re Lacking Before Applying
              </h2>
              <p className="mt-3 text-sm text-[#64748B] leading-relaxed">
                Paste any job description and let Groq AI compare it against your profile. Get missing skills, experience gaps, fit scores, and actionable recommendations instantly.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0052CC] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-[#0052CC]/25 transition hover:bg-[#0043A4]"
              >
                <span>Try Resume Gap Analyzer</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-8 text-center text-xs text-[#64748B]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2 font-medium">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#0052CC] text-[10px] font-bold text-white">
              C
            </span>
            CareerFlow AI · Autonomous Career Tracking & Outreach
          </div>
          <div className="text-slate-400">
            Powered by Groq AI & Gmail Intelligence
          </div>
        </div>
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

