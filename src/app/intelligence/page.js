"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { APPLICATION_STATUS_LABELS, STATUS_STYLES } from "@/lib/labels";
import {
  BarChart3,
  Target,
  Calendar,
  AlertTriangle,
  Building2,
  Lightbulb,
  Send,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Bot,
  User,
  Clock,
  Briefcase,
  Layers,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const STARTER_PROMPTS = [
  {
    id: "funnel",
    icon: BarChart3,
    iconColor: "text-blue-600 bg-blue-50 border-blue-200",
    title: "Application Funnel",
    desc: "Calculate stage conversions & drop-offs",
    query: "How is my application funnel performing and where is my biggest bottleneck?",
    mode: "analyze",
  },
  {
    id: "roles",
    icon: Target,
    iconColor: "text-indigo-600 bg-indigo-50 border-indigo-200",
    title: "Role Performance",
    desc: "Compare AI/ML vs Fullstack vs SWE",
    query: "Which job roles give me the highest interview rate?",
    mode: "analyze",
  },
  {
    id: "report",
    icon: Calendar,
    iconColor: "text-violet-600 bg-violet-50 border-violet-200",
    title: "Weekly Report",
    desc: "Executive summary of progress & changes",
    query: "Give me my weekly job-search report with highlights and attention items.",
    mode: "decide",
  },
  {
    id: "stale",
    icon: AlertTriangle,
    iconColor: "text-amber-600 bg-amber-50 border-amber-200",
    title: "Stale Applications",
    desc: "Find jobs with no status update in >14 days",
    query: "Which applications are currently stale and waiting for a response?",
    mode: "query",
  },
  {
    id: "sources",
    icon: Building2,
    iconColor: "text-emerald-600 bg-emerald-50 border-emerald-200",
    title: "Source Breakdown",
    desc: "Compare LinkedIn vs Referrals vs Portals",
    query: "Which application sources or channels are converting best for me?",
    mode: "analyze",
  },
  {
    id: "strategy",
    icon: Lightbulb,
    iconColor: "text-cyan-600 bg-cyan-50 border-cyan-200",
    title: "Strategic Focus",
    desc: "AI recommendations to maximize offers",
    query: "What should I focus on to improve my conversion rates and land offers?",
    mode: "decide",
  },
];

export default function IntelligencePage() {
  const router = useRouter();
  const { user, checking } = useRequireAuth();

  const [snapshot, setSnapshot] = useState(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);

  // Chat state
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "**Welcome to Job Search Intelligence**\n\nI am your dedicated analytics and decision assistant. I pull verified metrics directly from your application database to analyze your funnel, compare roles, detect bottlenecks, and provide data-backed recommendations.\n\n*Submit a question below or choose from the recommended queries.*",
      suggestedFollowUps: [
        "How is my application funnel performing?",
        "Which job roles give me the highest interview rate?",
        "Give me my weekly job-search report.",
      ],
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMode, setActiveMode] = useState("all"); // 'all' | 'query' | 'analyze' | 'decide'

  const messagesEndRef = useRef(null);

  // Load snapshot on mount
  useEffect(() => {
    if (!user) return;
    async function loadSnapshot() {
      try {
        const res = await fetch("/api/intelligence/snapshot");
        const data = await res.json();
        if (res.ok && data.snapshot) {
          setSnapshot(data.snapshot);
        }
      } catch (err) {
        console.error("Failed to load intelligence snapshot:", err);
      } finally {
        setLoadingSnapshot(false);
      }
    }
    loadSnapshot();
  }, [user]);

  // Scroll to bottom when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSubmitting]);

  async function handleSendMessage(customPrompt) {
    const text = customPrompt || inputQuery;
    if (!text || !text.trim() || isSubmitting) return;

    const userMsg = {
      id: "user-" + Date.now(),
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputQuery("");
    setIsSubmitting(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/intelligence/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: historyPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze question");
      }

      const botMsg = {
        id: "bot-" + Date.now(),
        role: "assistant",
        content: data.reply,
        intent: data.intent,
        keyMetrics: data.keyMetrics,
        suggestedFollowUps: data.suggestedFollowUps || [],
        applicationResults: data.applicationResults || [],
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: `**Analysis Error:** ${err.message}. Please verify connection and try again.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    fetch("/api/auth/logout", { method: "POST" }).then(() => {
      router.push("/login");
    });
  }

  function handleResetChat() {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Conversation history cleared. What would you like to analyze regarding your applications and pipeline?",
        suggestedFollowUps: [
          "How is my application funnel performing?",
          "Which job roles give me the highest interview rate?",
          "Give me my weekly job-search report.",
        ],
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-sm text-slate-400 font-sans">
        Loading Intelligence…
      </div>
    );
  }

  const summary = snapshot?.summary || {
    total: 0,
    active: 0,
    interviews: 0,
    offers: 0,
    bestRole: "—",
    biggestBottleneck: "—",
    staleCount: 0,
  };

  const filteredStarters =
    activeMode === "all"
      ? STARTER_PROMPTS
      : STARTER_PROMPTS.filter((p) => p.mode === activeMode);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A] font-sans">
      {/* Header Navigation */}
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

          <nav className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/70 px-3 py-1 text-xs font-semibold text-blue-800 md:flex">
              <span className="h-2 w-2 rounded-full bg-[#0052CC] animate-pulse" />
              Intelligence Engine Live
            </div>
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Dashboard
            </Link>
            <Link
              href="/jobs"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Recommended Jobs
            </Link>
            <Link
              href="/intelligence"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#0052CC] bg-blue-50/80"
            >
              Intelligence
            </Link>
            <Link
              href="/profile"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Profile
            </Link>
            <Link
              href="/agent"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Agent Logs
            </Link>
            <Link
              href="/browser"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Browser
            </Link>
            <ThemeToggle className="ml-1" />
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

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6">
        {/* Top Analytics Ribbon */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Total Applied</span>
              <Briefcase className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {loadingSnapshot ? "…" : summary.total}
              </span>
              <span className="text-xs text-slate-500">jobs</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Active Pipelines</span>
              <Layers className="h-3.5 w-3.5 text-[#0052CC]" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#0052CC]">
                {loadingSnapshot ? "…" : summary.active}
              </span>
              <span className="text-xs text-blue-600 font-medium">in progress</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Interviews</span>
              <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-indigo-600">
                {loadingSnapshot ? "…" : summary.interviews}
              </span>
              <span className="text-xs text-indigo-500">reached</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Offers</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-emerald-600">
                {loadingSnapshot ? "…" : summary.offers}
              </span>
              <span className="text-xs text-emerald-600 font-medium">received</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Top Role</span>
              <Target className="h-3.5 w-3.5 text-violet-600" />
            </div>
            <div className="mt-1 truncate text-sm font-bold text-slate-900" title={summary.bestRole}>
              {loadingSnapshot ? "…" : summary.bestRole.split("(")[0]}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {summary.bestRole.includes("(") ? "(" + summary.bestRole.split("(")[1] : "Highest conversion"}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-amber-700">
              <span>Bottleneck</span>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="mt-1 truncate text-xs font-bold text-amber-900" title={summary.biggestBottleneck}>
              {loadingSnapshot ? "…" : summary.biggestBottleneck}
            </div>
            <div className="text-[11px] text-amber-600">Primary drop-off</div>
          </div>
        </section>

        {/* Intelligence Workspace Grid */}
        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left / Main: Chat Interface */}
          <div className="flex flex-col rounded-3xl border border-slate-200/80 bg-white shadow-sm lg:col-span-8 overflow-hidden h-[720px]">
            {/* Chat Header Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0052CC] text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Job Search Intelligence Assistant</h2>
                  <p className="text-[11px] text-slate-500">Deterministic Analytics & LLM Reasoning</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetChat}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                  Clear Chat
                </button>
              </div>
            </div>

            {/* Mode Filter Pills */}
            <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-6 py-2.5 overflow-x-auto text-xs">
              <span className="font-semibold text-slate-400 mr-1">Modes:</span>
              <button
                type="button"
                onClick={() => setActiveMode("all")}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  activeMode === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Capabilities
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("query")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition ${
                  activeMode === "query"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Query Data
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("analyze")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition ${
                  activeMode === "analyze"
                    ? "bg-[#0052CC] text-white"
                    : "bg-blue-50 text-[#0052CC] hover:bg-blue-100"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Analyze Funnel
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("decide")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition ${
                  activeMode === "decide"
                    ? "bg-purple-600 text-white"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                Strategic Advice
              </button>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl p-4 sm:max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-[#0052CC] text-white rounded-br-none shadow-md shadow-blue-500/10"
                        : "bg-white border border-slate-200/90 text-slate-800 rounded-bl-none shadow-sm"
                    }`}
                  >
                    {/* Message Content */}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>

                    {/* Application Result Cards if attached */}
                    {msg.applicationResults && msg.applicationResults.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Matching Applications ({msg.applicationResults.length})
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.applicationResults.map((app, idx) => (
                            <div
                              key={app.id || idx}
                              className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 text-xs hover:border-blue-300 transition"
                            >
                              <div className="font-bold text-slate-900 truncate">
                                {app.companyName}
                              </div>
                              <div className="text-slate-600 truncate">{app.roleTitle}</div>
                              <div className="mt-1.5 flex items-center justify-between">
                                <span
                                  className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                    STATUS_STYLES[app.currentStatus] || "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {APPLICATION_STATUS_LABELS[app.currentStatus] || app.currentStatus}
                                </span>
                                {app.daysSince !== undefined && (
                                  <span className="text-[10px] text-amber-700 font-medium">
                                    {app.daysSince}d waiting
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested Follow-Ups */}
                    {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1.5">
                          <Sparkles className="h-3 w-3 text-blue-500" />
                          Suggested follow-ups:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedFollowUps.map((prompt, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => handleSendMessage(prompt)}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200/80 bg-blue-50/60 px-2.5 py-1 text-xs font-medium text-[#0052CC] hover:bg-blue-100/80 hover:border-blue-300 transition text-left"
                            >
                              <span>{prompt}</span>
                              <ChevronRight className="h-3 w-3 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="mt-1 text-[10px] text-slate-400 px-1">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                  </span>
                </div>
              ))}

              {isSubmitting && (
                <div className="flex items-start">
                  <div className="rounded-2xl rounded-bl-none border border-slate-200 bg-white p-4 shadow-sm text-sm text-slate-600 flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#0052CC] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-[#0052CC] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-[#0052CC] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span>Querying database & analyzing metrics…</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="border-t border-slate-200/80 bg-white p-4"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask anything about your job search (e.g., 'What is my OA pass rate?', 'Show active ML jobs')..."
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/15"
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !inputQuery.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0052CC] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-[#0052CC]/25 transition hover:bg-[#0047B3] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Send</span>
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Right Side: Quick Prompts & Funnel Visualizer */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            {/* Starter Prompts Card */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Recommended Queries</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {filteredStarters.length} Prompts
                </span>
              </div>

              <div className="space-y-2.5">
                {filteredStarters.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSendMessage(item.query)}
                      className="w-full text-left rounded-2xl border border-slate-200/70 bg-slate-50/50 p-3.5 hover:border-blue-200 hover:bg-blue-50/50 transition group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl border shrink-0 ${item.iconColor}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-900 group-hover:text-[#0052CC] transition">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {item.desc}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0052CC] group-hover:translate-x-0.5 transition shrink-0 mt-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Funnel Snapshot Card */}
            {snapshot?.funnel && (
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Live Funnel Breakdown</h3>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                      <span>Applications Submitted</span>
                      <span className="font-bold text-slate-900">{snapshot.funnel.appliedCount}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                      <span>Assessments (OA)</span>
                      <span className="font-bold text-slate-900">
                        {snapshot.funnel.assessmentCount} ({snapshot.funnel.rates.appToAssessmentRate}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(snapshot.funnel.rates.appToAssessmentRate, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                      <span>Interviews</span>
                      <span className="font-bold text-slate-900">
                        {snapshot.funnel.interviewCount} ({snapshot.funnel.rates.assessmentToInterviewRate}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${Math.min(snapshot.funnel.rates.assessmentToInterviewRate, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                      <span>Offers</span>
                      <span className="font-bold text-emerald-600">
                        {snapshot.funnel.offerCount} ({snapshot.funnel.rates.overallOfferRate}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(snapshot.funnel.rates.overallOfferRate * 5, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      handleSendMessage("Provide a deep-dive analysis of my application funnel bottlenecks and how to fix them.")
                    }
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0052CC] hover:underline"
                  >
                    <span>Analyze Funnel in Chat</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
