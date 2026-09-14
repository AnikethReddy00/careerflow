"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import {
  Sparkles,
  Search,
  Filter,
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  CheckCircle2,
  ExternalLink,
  Zap,
  TrendingUp,
  Globe,
  SlidersHorizontal,
  PlusCircle,
  Clock,
  ChevronRight,
  AlertCircle,
  X,
  Target,
  FileText,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  BookmarkCheck,
} from "lucide-react";

const CATEGORIES = [
  "All",
  "AI / ML",
  "Full Stack",
  "Frontend",
  "Backend",
  "DevOps / Cloud",
  "Data",
];

export default function JobRecommendationsPage() {
  const router = useRouter();
  const { user, checking } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [summary, setSummary] = useState({
    totalCount: 0,
    topRoleCategory: "Full Stack Engineer",
    averageMatch: 85,
  });

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [highMatchOnly, setHighMatchOnly] = useState(false);
  const [sortBy, setSortBy] = useState("match"); // 'match' | 'salary' | 'recent'

  // Modal / Drawer state for "Fit & Prep Coach"
  const [activeJobModal, setActiveJobModal] = useState(null);

  // Tracking state per job ID: { [jobId]: 'idle' | 'tracking' | 'tracked' }
  const [trackedMap, setTrackedMap] = useState({});
  const [toastMessage, setToastMessage] = useState("");

  async function fetchRecommendations() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "All") params.set("category", selectedCategory);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (remoteOnly) params.set("remoteOnly", "true");

      const res = await fetch(`/api/jobs/recommendations?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setJobs(data.recommendations || []);
        setSummary({
          totalCount: data.totalCount || 0,
          topRoleCategory: data.topRoleCategory || "Full Stack Engineer",
          averageMatch: data.averageMatch || 85,
        });
      }
    } catch (err) {
      console.error("Failed to fetch job recommendations:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checking && user) {
      fetchRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, user, selectedCategory, remoteOnly]);

  // Client-side filtering & sorting
  const displayedJobs = useMemo(() => {
    let list = [...jobs];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.requiredSkills.some((s) => s.toLowerCase().includes(q)) ||
          j.location.toLowerCase().includes(q)
      );
    }

    if (highMatchOnly) {
      list = list.filter((j) => j.matchScore >= 80);
    }

    if (sortBy === "salary") {
      list.sort((a, b) => b.salaryMin - a.salaryMin);
    } else if (sortBy === "recent") {
      list.sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
    } else {
      list.sort((a, b) => b.matchScore - a.matchScore);
    }

    return list;
  }, [jobs, searchQuery, highMatchOnly, sortBy]);

  async function handleTrackInPipeline(job) {
    if (trackedMap[job.id] === "tracked" || trackedMap[job.id] === "tracking") return;

    setTrackedMap((prev) => ({ ...prev, [job.id]: "tracking" }));
    try {
      const res = await fetch("/api/jobs/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: job.company,
          roleTitle: job.title,
          jobUrl: job.applyUrl,
          salaryRange: job.salaryRange,
          notes: `Matched at ${job.matchScore}% via JobSync Recommendation Engine. Required skills: ${job.requiredSkills.join(", ")}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTrackedMap((prev) => ({ ...prev, [job.id]: "tracked" }));
        setToastMessage(data.message || `Tracked ${job.company} in pipeline!`);
        setTimeout(() => setToastMessage(""), 4000);
      } else {
        setTrackedMap((prev) => ({ ...prev, [job.id]: "idle" }));
      }
    } catch {
      setTrackedMap((prev) => ({ ...prev, [job.id]: "idle" }));
    }
  }

  function handleLaunchBrowserAutofill(job) {
    const url = job.demoUrl || job.applyUrl;
    router.push(`/browser?url=${encodeURIComponent(url)}&company=${encodeURIComponent(job.company)}&role=${encodeURIComponent(job.title)}`);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500">
          <Sparkles className="h-5 w-5 animate-spin text-[#0052CC]" />
          <span className="text-sm font-medium">Loading recommendations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-900 px-4 py-3 text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-300" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage("")}
            className="ml-2 text-emerald-200 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0052CC] text-white shadow-sm shadow-blue-500/30">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                CareerFlow
              </span>
            </Link>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#0052CC] border border-blue-200">
              Job Recommendations
            </span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Applications
            </Link>
            <Link
              href="/jobs"
              className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-[#0052CC] transition"
            >
              Recommended Jobs
            </Link>
            <Link
              href="/intelligence"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
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
              href="/browser"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Browser
            </Link>
            <Link
              href="/agent"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              Agent Logs
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Top Intelligence Stats Ribbon */}
        <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Matching Jobs</span>
              <Briefcase className="h-4 w-4 text-[#0052CC]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900">
                {loading ? "…" : displayedJobs.length}
              </span>
              <span className="text-xs text-slate-500">live postings</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Top Fit Domain</span>
              <Target className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight text-indigo-600 truncate">
                {summary.topRoleCategory}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Average Match</span>
              <Sparkles className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-emerald-600">
                {summary.averageMatch}%
              </span>
              <span className="text-xs text-emerald-700 font-medium">compatibility</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Remote Postings</span>
              <Globe className="h-4 w-4 text-violet-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-violet-600">
                {jobs.filter((j) => j.workplaceType === "Remote").length}
              </span>
              <span className="text-xs text-violet-600 font-medium">worldwide</span>
            </div>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <section className="mb-8 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by role title, company, or tech stack (e.g. Next.js, Python, Stripe)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick toggles */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setRemoteOnly(!remoteOnly)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                  remoteOnly
                    ? "border-blue-600 bg-blue-50 text-[#0052CC]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                Remote Only
              </button>

              <button
                type="button"
                onClick={() => setHighMatchOnly(!highMatchOnly)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                  highMatchOnly
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                80%+ High Match
              </button>

              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium text-slate-500">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="match">Highest Match %</option>
                  <option value="salary">Highest Salary</option>
                  <option value="recent">Recently Posted</option>
                </select>
              </div>
            </div>
          </div>

          {/* Role Category Filter Pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">
              Category:
            </span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3.5 py-1 text-xs font-medium transition ${
                  selectedCategory === cat
                    ? "bg-[#0052CC] text-white shadow-sm shadow-blue-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Recommendations List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Sparkles className="h-8 w-8 animate-spin text-[#0052CC]" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              Matching your profile against market opportunities...
            </p>
          </div>
        ) : displayedJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Briefcase className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-slate-800">
              No matching jobs found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Try adjusting your category filter, clearing your search, or relaxing the match threshold.
            </p>
            <button
              onClick={() => {
                setSelectedCategory("All");
                setSearchQuery("");
                setRemoteOnly(false);
                setHighMatchOnly(false);
              }}
              className="mt-4 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {displayedJobs.map((job) => {
              const isTracked = trackedMap[job.id] === "tracked";
              const isTracking = trackedMap[job.id] === "tracking";

              return (
                <div
                  key={job.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition duration-200 hover:border-blue-300 hover:shadow-md"
                >
                  <div>
                    {/* Top Row: Company & Match Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white font-bold text-sm shadow-sm ${job.logoColor}`}
                        >
                          {job.company.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              {job.company}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-400">
                              {job.postedDaysAgo === 1 ? "1d ago" : `${job.postedDaysAgo}d ago`}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0052CC] transition">
                            {job.title}
                          </h3>
                        </div>
                      </div>

                      {/* Match Score Gauge */}
                      <div className="text-right">
                        <div
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${job.tierBadgeClass}`}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>{job.matchScore}% Match</span>
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-slate-500">
                          {job.matchTier}
                        </div>
                      </div>
                    </div>

                    {/* Metadata tags: Location, Workplace, Salary */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 font-medium">
                        <MapPin className="h-3 w-3 text-slate-500" />
                        {job.location}
                      </span>
                      <span
                        className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold ${
                          job.workplaceType === "Remote"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <Globe className="h-3 w-3" />
                        {job.workplaceType}
                      </span>
                      <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">
                        <DollarSign className="h-3 w-3 text-emerald-600" />
                        {job.salaryRange}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                        {job.experienceLevel}
                      </span>
                    </div>

                    {/* Description preview */}
                    <p className="mt-3 text-xs leading-relaxed text-slate-600 line-clamp-2">
                      {job.description}
                    </p>

                    {/* Matched & Required Skills */}
                    <div className="mt-4 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
                          Matched Skills:
                        </span>
                        {job.matchedSkills.slice(0, 5).map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200/60"
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            {skill}
                          </span>
                        ))}
                        {job.missingSkills.slice(0, 2).map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
                          >
                            + {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Highlights bullet */}
                    {job.tailoredHighlights?.[0] && (
                      <div className="mt-3.5 flex items-start gap-2 rounded-xl bg-blue-50/50 p-2.5 text-xs text-blue-900 border border-blue-100">
                        <Lightbulb className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                        <span className="leading-snug">{job.tailoredHighlights[0]}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setActiveJobModal(job)}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#0052CC] transition"
                    >
                      <Target className="h-3.5 w-3.5 text-slate-400" />
                      Fit & Prep Coach
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Track in Pipeline */}
                      <button
                        type="button"
                        onClick={() => handleTrackInPipeline(job)}
                        disabled={isTracked || isTracking}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                          isTracked
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {isTracked ? (
                          <>
                            <BookmarkCheck className="h-3.5 w-3.5 text-emerald-600" />
                            Tracked
                          </>
                        ) : isTracking ? (
                          <>
                            <Sparkles className="h-3.5 w-3.5 animate-spin text-slate-400" />
                            Tracking...
                          </>
                        ) : (
                          <>
                            <PlusCircle className="h-3.5 w-3.5 text-slate-500" />
                            Track in Pipeline
                          </>
                        )}
                      </button>

                      {/* 1-Click Apply via Browser */}
                      <button
                        type="button"
                        onClick={() => handleLaunchBrowserAutofill(job)}
                        className="flex items-center gap-1.5 rounded-xl bg-[#0052CC] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 active:scale-[0.98]"
                      >
                        <Zap className="h-3.5 w-3.5 fill-current" />
                        Autofill Apply
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Fit & Prep Coach Modal */}
      {activeJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold text-base shadow-sm ${activeJobModal.logoColor}`}
                >
                  {activeJobModal.company.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {activeJobModal.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    {activeJobModal.company} • {activeJobModal.location} ({activeJobModal.workplaceType})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveJobModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-5 space-y-5">
              {/* Compatibility Breakdown Bars */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Overall Candidate Alignment
                  </span>
                  <span className="text-sm font-bold text-[#0052CC]">
                    {activeJobModal.matchScore}% Match ({activeJobModal.matchTier})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                    <div className="text-[11px] text-slate-400">Tech Skills</div>
                    <div className="text-sm font-bold text-slate-800">
                      {activeJobModal.scoreBreakdown?.skills}%
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                    <div className="text-[11px] text-slate-400">Role Fit</div>
                    <div className="text-sm font-bold text-slate-800">
                      {activeJobModal.scoreBreakdown?.roleFit}%
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                    <div className="text-[11px] text-slate-400">Workplace</div>
                    <div className="text-sm font-bold text-slate-800">
                      {activeJobModal.scoreBreakdown?.workplaceFit}%
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                    <div className="text-[11px] text-slate-400">Historical Rate</div>
                    <div className="text-sm font-bold text-slate-800">
                      {activeJobModal.scoreBreakdown?.historicalAffinity}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Skill Matches & Gaps */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Skills & Keyword Analysis
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Matching Strengths ({activeJobModal.matchedSkills.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeJobModal.matchedSkills.map((s) => (
                        <span
                          key={s}
                          className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      Growth / Gap Areas ({activeJobModal.missingSkills.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeJobModal.missingSkills.length > 0 ? (
                        activeJobModal.missingSkills.map((s) => (
                          <span
                            key={s}
                            className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">
                          Zero missing required skills! Complete coverage.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actionable Strategy Advice */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 mb-1">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  Application & Interview Strategy
                </div>
                <p className="text-xs leading-relaxed text-blue-800">
                  {activeJobModal.gapAdvice}
                </p>
              </div>

              {/* Key Job Highlights */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Role Highlights & Benefits
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {activeJobModal.highlights?.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  handleTrackInPipeline(activeJobModal);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {trackedMap[activeJobModal.id] === "tracked"
                  ? "Tracked in Pipeline"
                  : "Track in Pipeline"}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleLaunchBrowserAutofill(activeJobModal);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <Zap className="h-3.5 w-3.5 fill-current" />
                Launch Browser Autofill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
