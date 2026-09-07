"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";

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
    <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
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
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-400">
            Nothing added yet.
          </div>
        ) : (
          items.map((item, index) => (
            <div key={item._id || `${title}-${index}`} className="min-w-0 rounded-xl border border-zinc-200 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-zinc-700">
                  {title.slice(0, -1)} {index + 1}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onMove(index, -1)}
                    disabled={index === 0}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 disabled:opacity-40"
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(index, 1)}
                    disabled={index === items.length - 1}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 disabled:opacity-40"
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600"
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
        className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
      >
        Add {title.slice(0, -1)}
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

  async function handleSave() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");
      setProfile(data.profile || EMPTY_PROFILE);
      setCompleteness(data.completeness || completeness);
      setCandidateContext(data.candidateContext || null);
      setNotice("Profile saved.");
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
      parts.push("Experience:\n" + profile.experience.map((e) => `- ${e.title} at ${e.company}: ${e.highlights?.join(". ") || ""}`).join("\n"));
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
    "block min-w-0 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const labelClass = "mb-1 block text-xs font-medium text-zinc-600";

  if (checking || loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden bg-zinc-50 text-zinc-900">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            C
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            CareerFlow<span className="text-indigo-600"> AI</span>
          </span>
        </Link>
        <nav className="flex min-w-0 flex-wrap items-center justify-end gap-4">
          <Link href="/dashboard" className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800">
            Applications
          </Link>
          <Link href="/agent" className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800">
            Agent
          </Link>
          <Link href="/browser" className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800">
            Browser
          </Link>
          {user?.email && <span className="hidden max-w-[220px] truncate text-sm text-zinc-400 sm:inline">{user.email}</span>}
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Log out
          </button>
        </nav>
      </header>

      <main className="mx-auto min-w-0 w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4 pt-6">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">Candidate profile</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              This is the single source of truth the application tracker, browser-assisted flow,
              and agent all read from when they need your reusable candidate data.
            </p>
          </div>
          <div className="w-full rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm sm:w-auto sm:min-w-[260px]">
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
              Completeness
            </div>
            <div className="mt-2 text-3xl font-semibold text-zinc-900">{completeness.percent}%</div>
            <div className="mt-1 text-sm text-zinc-500">
              {completeness.completed} of {completeness.total} key profile areas filled.
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
          </div>
        </div>

        {(error || notice) && (
          <div className="mt-6 space-y-3">
            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {notice}
              </p>
            )}
          </div>
        )}

        {/* AI Resume vs JD Gap Analyzer Chatbot */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-indigo-200/80 bg-white shadow-sm">
          <div className="border-b border-indigo-100 bg-indigo-50/50 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm shadow-indigo-200">
                🤖
              </span>
              <div>
                <h2 className="text-base font-bold text-zinc-900">
                  AI Resume vs JD Gap Analyzer & Coach
                </h2>
                <p className="text-xs text-zinc-500">
                  Powered by AI. Paste your resume and any job description to discover what you are lacking.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAnalyzer((v) => !v)}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline"
            >
              {showAnalyzer ? "Collapse Analyzer" : "Open Analyzer"}
            </button>
          </div>

          {showAnalyzer && (
            <div className="p-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-700">
                      Your Resume Text
                    </label>
                    <button
                      type="button"
                      onClick={handleFillFromProfile}
                      className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      + Pull from Saved Profile
                    </button>
                  </div>
                  <textarea
                    rows={7}
                    className="w-full rounded-xl border border-zinc-200 p-3 text-xs text-zinc-800 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                    placeholder="Paste your full resume text here, or click 'Pull from Saved Profile' above..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Target Job Description (JD) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={7}
                    className="w-full rounded-xl border border-zinc-200 p-3 text-xs text-zinc-800 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                    placeholder="Paste the job requirements, responsibilities, or entire job description here..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                  />
                </div>
              </div>

              {analysisError && (
                <p className="mt-3 text-xs font-medium text-rose-600">{analysisError}</p>
              )}

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleAnalyze()}
                  disabled={analyzing || !jdText.trim()}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {analyzing ? "Analyzing Gap with AI..." : "🔍 Analyze Resume Gaps with AI"}
                </button>
                {analysisResult && (
                  <span className="text-xs font-medium text-zinc-500">
                    Fit Score:{" "}
                    <span className="font-bold text-indigo-600">
                      {analysisResult.matchScore}%
                    </span>
                  </span>
                )}
              </div>

              {/* Chat & Analysis Results Area */}
              {chatMessages.length > 0 && (
                <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/70 p-5">
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className="space-y-3">
                        {msg.role === "user" ? (
                          <div className="flex justify-end">
                            <div className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs text-white max-w-[85%] shadow-sm">
                              {msg.text}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-start gap-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700">
                                AI
                              </span>
                              <div className="flex-1 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm text-xs text-zinc-800">
                                <p className="leading-relaxed font-medium">{msg.text}</p>

                                {msg.analysis && (
                                  <div className="mt-4 space-y-3 border-t border-zinc-100 pt-3">
                                    {/* Missing Skills / What is Lacking */}
                                    {msg.analysis.missingSkills?.length > 0 && (
                                      <div>
                                        <h4 className="font-bold text-rose-700 flex items-center gap-1.5 text-xs">
                                          <span>❌ What You Are Lacking (Missing Skills & Keywords):</span>
                                        </h4>
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                          {msg.analysis.missingSkills.map((skill, i) => (
                                            <span
                                              key={i}
                                              className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-semibold text-rose-800"
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
                                          <span>✅ Strong Matches Found:</span>
                                        </h4>
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                          {msg.analysis.matchingSkills.map((skill, i) => (
                                            <span
                                              key={i}
                                              className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
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
                                        <h4 className="font-bold text-amber-800 text-xs">
                                          ⚠️ Experience & Depth Gaps:
                                        </h4>
                                        <ul className="mt-1 list-disc list-inside space-y-0.5 text-zinc-700">
                                          {msg.analysis.experienceGaps.map((gap, i) => (
                                            <li key={i}>{gap}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Action Recommendations */}
                                    {msg.analysis.recommendations?.length > 0 && (
                                      <div>
                                        <h4 className="font-bold text-indigo-900 text-xs">
                                          💡 Actionable Recommendations:
                                        </h4>
                                        <ul className="mt-1 list-disc list-inside space-y-0.5 text-zinc-700">
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
                  <div className="mt-4 flex gap-2 pt-2 border-t border-zinc-200">
                    <input
                      type="text"
                      className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                      className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
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
          <SectionCard title="Personal information" subtitle="Core contact details reused across applications.">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              {[
                ["firstName", "First name"],
                ["lastName", "Last name"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["location", "Location"],
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
                <label className="min-w-0"><span className={labelClass}>Field</span><input value={item.field || ""} onChange={(e) => updateArrayField("education", index, "field", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>Start date</span><input type="date" value={toDateInput(item.startDate)} onChange={(e) => updateArrayField("education", index, "startDate", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>End date</span><input type="date" value={toDateInput(item.endDate)} onChange={(e) => updateArrayField("education", index, "endDate", e.target.value)} className={inputClass} /></label>
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
                <label className="min-w-0"><span className={labelClass}>Title</span><input value={item.title || ""} onChange={(e) => updateArrayField("experience", index, "title", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>Start date</span><input type="date" value={toDateInput(item.startDate)} onChange={(e) => updateArrayField("experience", index, "startDate", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>End date</span><input type="date" value={toDateInput(item.endDate)} onChange={(e) => updateArrayField("experience", index, "endDate", e.target.value)} className={inputClass} /></label>
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
                <label className="min-w-0"><span className={labelClass}>Name</span><input value={item.name || ""} onChange={(e) => updateArrayField("projects", index, "name", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>URL</span><input value={item.url || ""} onChange={(e) => updateArrayField("projects", index, "url", e.target.value)} className={inputClass} /></label>
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

          <SectionCard title="Work authorization" subtitle="Stored separately so later automations can reason about eligibility and sponsorship needs.">
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

          <SectionCard title="Preferences" subtitle="This helps future ranking, filtering, and job-fit prompts.">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <label className="min-w-0"><span className={labelClass}>Job types</span><input value={joinList(profile.preferences.jobTypes)} onChange={(e) => updatePreferences("jobTypes", splitList(e.target.value))} placeholder="Full-time, Internship" className={inputClass} /></label>
              <label className="min-w-0"><span className={labelClass}>Preferred locations</span><input value={joinList(profile.preferences.preferredLocations)} onChange={(e) => updatePreferences("preferredLocations", splitList(e.target.value))} placeholder="Chennai, Bengaluru, Remote" className={inputClass} /></label>
              <label className="min-w-0"><span className={labelClass}>Remote preference</span><input value={profile.preferences.remotePreference || ""} onChange={(e) => updatePreferences("remotePreference", e.target.value)} placeholder="Remote, Hybrid, Onsite" className={inputClass} /></label>
              <label className="min-w-0"><span className={labelClass}>Industries</span><input value={joinList(profile.preferences.industries)} onChange={(e) => updatePreferences("industries", splitList(e.target.value))} placeholder="Fintech, AI, SaaS" className={inputClass} /></label>
            </div>
          </SectionCard>

          <SectionCard title="Resume" subtitle="Reference info plus extracted text for later autofill and LLM prompts.">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <label className="min-w-0"><span className={labelClass}>File name</span><input value={profile.resume.fileName || ""} onChange={(e) => updateResume("fileName", e.target.value)} className={inputClass} /></label>
              <label className="min-w-0"><span className={labelClass}>File type</span><input value={profile.resume.fileType || ""} onChange={(e) => updateResume("fileType", e.target.value)} placeholder="pdf, docx" className={inputClass} /></label>
              <label className="md:col-span-2"><span className={labelClass}>File URL or reference</span><input value={profile.resume.fileUrl || ""} onChange={(e) => updateResume("fileUrl", e.target.value)} className={inputClass} /></label>
              <label className="md:col-span-2"><span className={labelClass}>Extracted resume text</span><textarea value={profile.resume.extractedText || ""} onChange={(e) => updateResume("extractedText", e.target.value)} rows={8} className={inputClass} /></label>
            </div>
          </SectionCard>

          <SectionCard title="Candidate context preview" subtitle="This is the sanitized read-only shape other agentic flows should consume.">
            <pre className="max-h-[360px] min-w-0 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-zinc-950 p-4 text-[12.5px] leading-6 text-zinc-100">
              {JSON.stringify(candidateContext, null, 2)}
            </pre>
          </SectionCard>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </main>
    </div>
  );
}
