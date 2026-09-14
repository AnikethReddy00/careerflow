"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import {
  Sparkles,
  BrainCircuit,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Zap,
  Check,
  RotateCcw,
  FileText,
} from "lucide-react";

const EMPTY_PROFILE = {
  personal: { firstName: "", lastName: "", email: "", phone: "", location: "" },
  education: [],
  experience: [],
  projects: [],
  skills: [],
  certifications: [],
  links: { linkedin: "", github: "", portfolio: "", other: [] },
  workAuthorization: { status: "", sponsorshipRequired: null },
  preferences: {
    jobTypes: [],
    preferredLocations: [],
    remotePreference: "",
    industries: [],
  },
  resume: {
    fileName: "",
    fileType: "",
    fileUrl: "",
    extractedText: "",
    uploadedAt: null,
    updatedAt: null,
  },
};

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function toDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-bold tracking-tight text-[#0F172A]">{title}</h2>
        {subtitle && <p className="mt-1 text-xs sm:text-sm text-[#64748B]">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function RepeaterSection({
  title,
  subtitle,
  items,
  onAdd,
  onRemove,
  onMove,
  renderItem,
}) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm text-slate-400">
            Nothing added yet.
          </div>
        ) : (
          items.map((item, index) => (
            <div key={item._id || `${title}-${index}`} className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {title.slice(0, -1)} {index + 1}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onMove(index, -1)}
                    disabled={index === 0}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(index, 1)}
                    disabled={index === items.length - 1}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {renderItem(item, index)}
            </div>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2 text-xs font-bold text-[#0052CC] transition hover:bg-blue-100"
      >
        + Add {title.slice(0, -1)}
      </button>
    </SectionCard>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, checking } = useRequireAuth();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [completeness, setCompleteness] = useState({ percent: 0, completed: 0, total: 0 });
  const [candidateContext, setCandidateContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Resume & JD Gap Chatbot Assistant
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [askingFollowUp, setAskingFollowUp] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load profile");
        if (cancelled) return;
        setProfile(data.profile || EMPTY_PROFILE);
        setCompleteness(data.completeness || { percent: 0, completed: 0, total: 0 });
        setCandidateContext(data.candidateContext || null);
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

  function updatePersonal(field, value) {
    setProfile((prev) => ({
      ...prev,
      personal: { ...prev.personal, [field]: value },
    }));
  }

  function updateLinks(field, value) {
    setProfile((prev) => ({
      ...prev,
      links: { ...prev.links, [field]: value },
    }));
  }

  function updatePreferences(field, value) {
    setProfile((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, [field]: value },
    }));
  }

  function updateWorkAuthorization(field, value) {
    setProfile((prev) => ({
      ...prev,
      workAuthorization: { ...prev.workAuthorization, [field]: value },
    }));
  }

  function updateResume(field, value) {
    setProfile((prev) => ({
      ...prev,
      resume: { ...prev.resume, [field]: value },
    }));
  }

  function updateArrayField(section, index, field, value) {
    setProfile((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  }

  function addArrayItem(section, item) {
    setProfile((prev) => ({
      ...prev,
      [section]: [...prev[section], item],
    }));
  }

  function removeArrayItem(section, index) {
    setProfile((prev) => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }));
  }

  function moveArrayItem(section, index, direction) {
    setProfile((prev) => {
      const items = [...prev[section]];
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= items.length) return prev;
      [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
      return { ...prev, [section]: items };
    });
  }

  async function handlePrefillProfile() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile/prefill", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to prefill profile");
      setProfile(data.profile);
      setCompleteness(data.completeness || { percent: 100, completed: 12, total: 12 });
      setCandidateContext(data.candidateContext || null);
      setNotice("Profile successfully prefilled with test resume & skills data.");
      setTimeout(() => setNotice(""), 5000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");
      setProfile(data.profile);
      setCompleteness(data.completeness || { percent: 0, completed: 0, total: 0 });
      setCandidateContext(data.candidateContext || null);
      setNotice("Profile changes saved successfully.");
      setTimeout(() => setNotice(""), 4000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleFillFromProfile() {
    const parts = [];
    if (profile.personal?.firstName) {
      parts.push(`Name: ${profile.personal.firstName} ${profile.personal.lastName || ""}`);
    }
    if (profile.skills?.length) {
      parts.push(`Skills: ${profile.skills.join(", ")}`);
    }
    if (profile.experience?.length) {
      parts.push("Experience:\n" + profile.experience.map((e) => `- ${e.title} at ${e.company}: ${e.highlights?.join(". ") || e.description || ""}`).join("\n"));
    }
    if (profile.projects?.length) {
      parts.push("Projects:\n" + profile.projects.map((p) => `- ${p.name}: ${p.description || ""} (Tech: ${p.technologies?.join(", ") || ""})`).join("\n"));
    }
    if (profile.education?.length) {
      parts.push("Education:\n" + profile.education.map((ed) => `- ${ed.degree} from ${ed.institution}`).join("\n"));
    }
    setResumeText(parts.join("\n\n"));
  }

  async function handleAnalyze(customQuestion = "") {
    const question = typeof customQuestion === "string" ? customQuestion : "";
    if (!jdText.trim()) {
      setAnalysisError("Please paste a Job Description (JD) to analyze.");
      return;
    }
    setAnalyzing(true);
    setAnalysisError("");
    try {
      const res = await fetch("/api/profile/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resumeText || undefined,
          jdText,
          question,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze resume gap");
      setAnalysisResult(data.analysis);
      setChatMessages((prev) => [
        ...prev,
        ...(question ? [{ role: "user", text: question }] : [{ role: "user", text: "Analyze my resume against this job description." }]),
        { role: "bot", text: data.analysis.botResponse, analysis: data.analysis },
      ]);
      setFollowUpInput("");
    } catch (e) {
      setAnalysisError(e.message);
    } finally {
      setAnalyzing(false);
      setAskingFollowUp(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const inputClass =
    "block min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-slate-400 transition focus:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/15";
  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

  if (checking || loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F8FAFC] text-sm text-slate-400 font-sans">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden bg-[#F8FAFC] text-[#0F172A] font-sans">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0052CC] text-sm font-bold text-white shadow-sm shadow-[#0052CC]/25">
              C
            </span>
            <span className="text-base font-bold tracking-tight text-[#0F172A]">
              CareerFlow<span className="text-[#0052CC]"> AI</span>
            </span>
          </Link>
          <nav className="flex min-w-0 flex-wrap items-center justify-end gap-3">
            <Link href="/dashboard" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/jobs" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900">
              Recommended Jobs
            </Link>
            <Link href="/intelligence" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900">
              Intelligence
            </Link>
            <Link href="/profile" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#0052CC] bg-blue-50/80">
              Profile
            </Link>
            <Link href="/agent" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900">
              Agent Logs
            </Link>
            <Link href="/browser" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900">
              Browser
            </Link>
            {user?.email && <span className="hidden max-w-[220px] truncate text-xs text-slate-400 sm:inline font-mono">{user.email}</span>}
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

      <main className="mx-auto min-w-0 w-full max-w-6xl flex-1 px-6 pb-16 pt-8">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">Candidate Profile</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#64748B]">
              This is the single source of truth the application tracker, browser-assisted flow,
              and agent all read from when they need your reusable candidate data.
            </p>
          </div>
          <div className="w-full rounded-2xl border border-blue-200/80 bg-white p-5 shadow-sm sm:w-auto sm:min-w-[260px]">
            <div className="text-xs font-bold uppercase tracking-wider text-[#0052CC]">
              Profile Completeness
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#0F172A]">{completeness.percent}%</div>
            <div className="mt-1 text-xs text-[#64748B]">
              {completeness.completed} of {completeness.total} key profile areas filled.
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#0052CC] transition-all"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
          </div>
        </div>

        {(error || notice) && (
          <div className="mt-6 space-y-3">
            {error && (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900 shadow-sm">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-sm">
                {notice}
              </p>
            )}
          </div>
        )}

        {/* AI Resume vs JD Gap Analyzer Chatbot */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-sm">
          <div className="border-b border-blue-100 bg-blue-50/50 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0052CC] text-white shadow-sm shadow-[#0052CC]/25">
                <BrainCircuit className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  AI Resume vs JD Gap Analyzer & Coach
                </h2>
                <p className="text-xs text-[#64748B]">
                  Powered by Groq AI. Paste your resume and any job description to discover what you are lacking.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAnalyzer((v) => !v)}
              className="text-xs font-semibold text-[#0052CC] hover:text-[#0043A4] underline"
            >
              {showAnalyzer ? "Collapse Analyzer" : "Open Analyzer"}
            </button>
          </div>

          {showAnalyzer && (
            <div className="p-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Your Resume Text
                    </label>
                    <button
                      type="button"
                      onClick={handleFillFromProfile}
                      className="text-xs font-semibold text-[#0052CC] hover:text-[#0043A4]"
                    >
                      + Pull from Saved Profile
                    </button>
                  </div>
                  <textarea
                    rows={7}
                    className="w-full rounded-xl border border-slate-200 p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/15 font-sans leading-relaxed"
                    placeholder="Paste your full resume text here, or click 'Pull from Saved Profile' above..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Job Description (JD) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={7}
                    className="w-full rounded-xl border border-slate-200 p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/15 font-sans leading-relaxed"
                    placeholder="Paste the job requirements, responsibilities, or entire job description here..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                  />
                </div>
              </div>

              {analysisError && (
                <p className="mt-3 text-xs font-semibold text-rose-600">{analysisError}</p>
              )}

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleAnalyze()}
                  disabled={analyzing || !jdText.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0052CC] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-[#0052CC]/25 transition hover:bg-[#0043A4] hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <Search className={`h-3.5 w-3.5 ${analyzing ? "animate-spin" : ""}`} />
                  <span>{analyzing ? "Analyzing Gap with AI..." : "Analyze Resume Gaps with AI"}</span>
                </button>
                {analysisResult && (
                  <span className="text-xs font-semibold text-[#64748B]">
                    Fit Score:{" "}
                    <span className="font-extrabold text-[#0052CC]">
                      {analysisResult.matchScore}%
                    </span>
                  </span>
                )}
              </div>

              {/* Chat & Analysis Results Area */}
              {chatMessages.length > 0 && (
                <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5">
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className="space-y-3">
                        {msg.role === "user" ? (
                          <div className="flex justify-end">
                            <div className="rounded-2xl bg-[#0052CC] px-4 py-2.5 text-xs text-white max-w-[85%] shadow-sm font-medium">
                              {msg.text}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-start gap-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-[#0052CC]">
                                AI
                              </span>
                              <div className="flex-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm text-xs text-slate-800">
                                <p className="leading-relaxed font-medium">{msg.text}</p>

                                {msg.analysis && (
                                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                                    {/* Missing Skills / What is Lacking */}
                                    {msg.analysis.missingSkills?.length > 0 && (
                                      <div>
                                        <h4 className="font-bold text-rose-700 flex items-center gap-1.5 text-xs">
                                          <XCircle className="h-3.5 w-3.5" />
                                          <span>What You Are Lacking (Missing Skills & Keywords):</span>
                                        </h4>
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                          {msg.analysis.missingSkills.map((skill, i) => (
                                            <span
                                              key={i}
                                              className="rounded-lg bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 text-[11px] font-bold text-rose-800"
                                            >
                                              {skill}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Matching Strengths */}
                                    {msg.analysis.matchingSkills?.length > 0 && (
                                      <div>
                                        <h4 className="font-bold text-emerald-700 flex items-center gap-1.5 text-xs">
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          <span>Strong Matches Found:</span>
                                        </h4>
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                          {msg.analysis.matchingSkills.map((skill, i) => (
                                            <span
                                              key={i}
                                              className="rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800"
                                            >
                                              {skill}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Experience Gaps */}
                                    {msg.analysis.experienceGaps?.length > 0 && (
                                      <div>
                                        <h4 className="font-bold text-amber-800 flex items-center gap-1.5 text-xs">
                                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                          <span>Experience & Depth Gaps:</span>
                                        </h4>
                                        <ul className="mt-1 list-disc list-inside space-y-0.5 text-slate-700">
                                          {msg.analysis.experienceGaps.map((gap, i) => (
                                            <li key={i}>{gap}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Action Recommendations */}
                                    {msg.analysis.recommendations?.length > 0 && (
                                      <div>
                                        <h4 className="font-bold text-[#0052CC] flex items-center gap-1.5 text-xs">
                                          <Lightbulb className="h-3.5 w-3.5" />
                                          <span>Actionable Recommendations:</span>
                                        </h4>
                                        <ul className="mt-1 list-disc list-inside space-y-0.5 text-slate-700">
                                          {msg.analysis.recommendations.map((rec, i) => (
                                            <li key={i}>{rec}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Follow-up question bar */}
                  <div className="mt-4 flex gap-2 pt-3 border-t border-slate-200">
                    <input
                      type="text"
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/15"
                      placeholder="Ask a follow up (e.g. 'How should I rewrite my bullet points for this?', 'Suggest projects to bridge this gap')..."
                      value={followUpInput}
                      onChange={(e) => setFollowUpInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && followUpInput.trim()) {
                          e.preventDefault();
                          handleAnalyze(followUpInput);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAnalyze(followUpInput)}
                      disabled={analyzing || !followUpInput.trim()}
                      className="rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0043A4] disabled:opacity-50"
                    >
                      {analyzing ? "..." : "Send"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 grid min-w-0 gap-6">
          <SectionCard title="Personal Information" subtitle="Core contact details reused across applications.">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              {[
                ["firstName", "First Name"],
                ["lastName", "Last Name"],
                ["email", "Email Address"],
                ["phone", "Phone Number"],
                ["location", "Location / City"],
              ].map(([field, label]) => (
                <label key={field} className="min-w-0">
                  <span className={labelClass}>{label}</span>
                  <input
                    value={profile.personal[field]}
                    onChange={(e) => updatePersonal(field, e.target.value)}
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          </SectionCard>

          <RepeaterSection
            title="Education"
            subtitle="Degrees, bootcamps, and academic background."
            items={profile.education}
            onAdd={() =>
              addArrayItem("education", {
                institution: "",
                degree: "",
                field: "",
                startDate: "",
                endDate: "",
                description: "",
              })
            }
            onRemove={(index) => removeArrayItem("education", index)}
            onMove={(index, direction) => moveArrayItem("education", index, direction)}
            renderItem={(item, index) => (
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <label className="min-w-0"><span className={labelClass}>Institution</span><input value={item.institution || ""} onChange={(e) => updateArrayField("education", index, "institution", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>Degree</span><input value={item.degree || ""} onChange={(e) => updateArrayField("education", index, "degree", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>Field of Study</span><input value={item.field || ""} onChange={(e) => updateArrayField("education", index, "field", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>Start Date</span><input type="date" value={toDateInput(item.startDate)} onChange={(e) => updateArrayField("education", index, "startDate", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>End Date</span><input type="date" value={toDateInput(item.endDate)} onChange={(e) => updateArrayField("education", index, "endDate", e.target.value)} className={inputClass} /></label>
                <label className="md:col-span-2"><span className={labelClass}>Description</span><textarea value={item.description || ""} onChange={(e) => updateArrayField("education", index, "description", e.target.value)} rows={4} className={inputClass} /></label>
              </div>
            )}
          />

          <RepeaterSection
            title="Experience"
            subtitle="Roles, internships, and impact statements."
            items={profile.experience}
            onAdd={() =>
              addArrayItem("experience", {
                company: "",
                title: "",
                startDate: "",
                endDate: "",
                description: "",
                skills: [],
              })
            }
            onRemove={(index) => removeArrayItem("experience", index)}
            onMove={(index, direction) => moveArrayItem("experience", index, direction)}
            renderItem={(item, index) => (
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <label className="min-w-0"><span className={labelClass}>Company</span><input value={item.company || ""} onChange={(e) => updateArrayField("experience", index, "company", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>Role Title</span><input value={item.title || ""} onChange={(e) => updateArrayField("experience", index, "title", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>Start Date</span><input type="date" value={toDateInput(item.startDate)} onChange={(e) => updateArrayField("experience", index, "startDate", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>End Date</span><input type="date" value={toDateInput(item.endDate)} onChange={(e) => updateArrayField("experience", index, "endDate", e.target.value)} className={inputClass} /></label>
                <label className="md:col-span-2"><span className={labelClass}>Description</span><textarea value={item.description || ""} onChange={(e) => updateArrayField("experience", index, "description", e.target.value)} rows={4} className={inputClass} /></label>
                <label className="md:col-span-2"><span className={labelClass}>Skills used</span><input value={joinList(item.skills)} onChange={(e) => updateArrayField("experience", index, "skills", splitList(e.target.value))} placeholder="React, Node.js, SQL" className={inputClass} /></label>
              </div>
            )}
          />

          <RepeaterSection
            title="Projects"
            subtitle="Personal, academic, or professional projects you want the agent to know."
            items={profile.projects}
            onAdd={() =>
              addArrayItem("projects", {
                name: "",
                description: "",
                technologies: [],
                url: "",
              })
            }
            onRemove={(index) => removeArrayItem("projects", index)}
            onMove={(index, direction) => moveArrayItem("projects", index, direction)}
            renderItem={(item, index) => (
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <label className="min-w-0"><span className={labelClass}>Project Name</span><input value={item.name || ""} onChange={(e) => updateArrayField("projects", index, "name", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>Project URL</span><input value={item.url || ""} onChange={(e) => updateArrayField("projects", index, "url", e.target.value)} className={inputClass} /></label>
                <label className="md:col-span-2"><span className={labelClass}>Description</span><textarea value={item.description || ""} onChange={(e) => updateArrayField("projects", index, "description", e.target.value)} rows={4} className={inputClass} /></label>
                <label className="md:col-span-2"><span className={labelClass}>Technologies</span><input value={joinList(item.technologies)} onChange={(e) => updateArrayField("projects", index, "technologies", splitList(e.target.value))} placeholder="Next.js, MongoDB, Playwright" className={inputClass} /></label>
              </div>
            )}
          />

          <SectionCard title="Skills" subtitle="Comma-separated global skills used for matching and candidate context.">
            <label className="min-w-0">
              <span className={labelClass}>Skills</span>
              <input
                value={joinList(profile.skills)}
                onChange={(e) => setProfile((prev) => ({ ...prev, skills: splitList(e.target.value) }))}
                placeholder="JavaScript, React, Node.js, MongoDB"
                className={inputClass}
              />
            </label>
          </SectionCard>

          <RepeaterSection
            title="Certifications"
            subtitle="Optional certifications and credentials."
            items={profile.certifications}
            onAdd={() =>
              addArrayItem("certifications", {
                name: "",
                issuer: "",
                issueDate: "",
                expirationDate: "",
                url: "",
              })
            }
            onRemove={(index) => removeArrayItem("certifications", index)}
            onMove={(index, direction) => moveArrayItem("certifications", index, direction)}
            renderItem={(item, index) => (
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <label className="min-w-0"><span className={labelClass}>Name</span><input value={item.name || ""} onChange={(e) => updateArrayField("certifications", index, "name", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>Issuer</span><input value={item.issuer || ""} onChange={(e) => updateArrayField("certifications", index, "issuer", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>Issue date</span><input type="date" value={toDateInput(item.issueDate)} onChange={(e) => updateArrayField("certifications", index, "issueDate", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>Expiration date</span><input type="date" value={toDateInput(item.expirationDate)} onChange={(e) => updateArrayField("certifications", index, "expirationDate", e.target.value)} className={inputClass} /></label>
                <label className="md:col-span-2"><span className={labelClass}>Credential URL</span><input value={item.url || ""} onChange={(e) => updateArrayField("certifications", index, "url", e.target.value)} className={inputClass} /></label>
              </div>
            )}
          />

          <SectionCard title="Links" subtitle="Public links the agent can reference or fill later.">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <label className="min-w-0"><span className={labelClass}>LinkedIn</span><input value={profile.links.linkedin} onChange={(e) => updateLinks("linkedin", e.target.value)} className={inputClass} /></label>
              <label className="min-w-0"><span className={labelClass}>GitHub</span><input value={profile.links.github} onChange={(e) => updateLinks("github", e.target.value)} className={inputClass} /></label>
              <label className="min-w-0"><span className={labelClass}>Portfolio</span><input value={profile.links.portfolio} onChange={(e) => updateLinks("portfolio", e.target.value)} className={inputClass} /></label>
              <label className="min-w-0"><span className={labelClass}>Other links</span><input value={joinList(profile.links.other)} onChange={(e) => updateLinks("other", splitList(e.target.value))} placeholder="Blog, Kaggle, Behance" className={inputClass} /></label>
            </div>
          </SectionCard>

          <SectionCard title="Work Authorization" subtitle="Stored separately so later automations can reason about eligibility and sponsorship needs.">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <label className="min-w-0">
                <span className={labelClass}>Current status</span>
                <input value={profile.workAuthorization.status || ""} onChange={(e) => updateWorkAuthorization("status", e.target.value)} placeholder="Citizen, Visa holder, Needs sponsorship" className={inputClass} />
              </label>
              <label className="min-w-0">
                <span className={labelClass}>Sponsorship required</span>
                <select
                  value={
                    profile.workAuthorization.sponsorshipRequired === null
                      ? ""
                      : profile.workAuthorization.sponsorshipRequired
                        ? "yes"
                        : "no"
                  }
                  onChange={(e) =>
                    updateWorkAuthorization(
                      "sponsorshipRequired",
                      e.target.value === "" ? null : e.target.value === "yes"
                    )
                  }
                  className={inputClass}
                >
                  <option value="">Not specified</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            </div>
          </SectionCard>

          <SectionCard title="Job Preferences" subtitle="Helps future ranking, filtering, and job-fit prompts.">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <label className="min-w-0"><span className={labelClass}>Job types</span><input value={joinList(profile.preferences.jobTypes)} onChange={(e) => updatePreferences("jobTypes", splitList(e.target.value))} placeholder="Full-time, Internship" className={inputClass} /></label>
              <label className="min-w-0"><span className={labelClass}>Preferred locations</span><input value={joinList(profile.preferences.preferredLocations)} onChange={(e) => updatePreferences("preferredLocations", splitList(e.target.value))} placeholder="Chennai, Bengaluru, Remote" className={inputClass} /></label>
              <label className="min-w-0"><span className={labelClass}>Remote preference</span><input value={profile.preferences.remotePreference || ""} onChange={(e) => updatePreferences("remotePreference", e.target.value)} placeholder="Remote, Hybrid, Onsite" className={inputClass} /></label>
              <label className="min-w-0"><span className={labelClass}>Industries</span><input value={joinList(profile.preferences.industries)} onChange={(e) => updatePreferences("industries", splitList(e.target.value))} placeholder="Fintech, AI, SaaS" className={inputClass} /></label>
            </div>
          </SectionCard>

          <SectionCard title="Resume Data" subtitle="Reference info plus extracted text for later autofill and LLM prompts.">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <label className="min-w-0"><span className={labelClass}>File name</span><input value={profile.resume.fileName || ""} onChange={(e) => updateResume("fileName", e.target.value)} className={inputClass} /></label>
              <label className="min-w-0"><span className={labelClass}>File type</span><input value={profile.resume.fileType || ""} onChange={(e) => updateResume("fileType", e.target.value)} placeholder="pdf, docx" className={inputClass} /></label>
              <label className="md:col-span-2"><span className={labelClass}>File URL or reference</span><input value={profile.resume.fileUrl || ""} onChange={(e) => updateResume("fileUrl", e.target.value)} className={inputClass} /></label>
              <label className="md:col-span-2"><span className={labelClass}>Extracted resume text</span><textarea value={profile.resume.extractedText || ""} onChange={(e) => updateResume("extractedText", e.target.value)} rows={8} className={inputClass} /></label>
            </div>
          </SectionCard>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handlePrefillProfile}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-[#0052CC] transition hover:bg-blue-100 disabled:opacity-60"
          >
            <Zap className="h-4 w-4" />
            <span>Prefill with Test Profile Data</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[#0052CC] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-[#0052CC]/25 transition hover:bg-[#0043A4] hover:-translate-y-0.5 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Profile Changes"}
          </button>
        </div>
      </main>
    </div>
  );
}

