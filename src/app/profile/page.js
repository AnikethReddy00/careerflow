"use client";

import { useEffect, useState, useRef } from "react";
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
  UploadCloud,
  FileUp,
  Trash2,
  Eye,
  EyeOff,
  Send,
  FileType,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import NavigationSheet from "@/components/NavigationSheet";
import AppLayout from "@/components/AppLayout";

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
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#0F172A] p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-bold tracking-tight text-[#0F172A] dark:text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-xs sm:text-sm text-[#64748B] dark:text-slate-400">{subtitle}</p>}
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
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50 px-4 py-5 text-sm text-slate-400">
            Nothing added yet.
          </div>
        ) : (
          items.map((item, index) => (
            <div key={item._id || `${title}-${index}`} className="min-w-0 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#1E293B]/50 p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {title.slice(0, -1)} {index + 1}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onMove(index, -1)}
                    disabled={index === 0}
                    className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(index, 1)}
                    disabled={index === items.length - 1}
                    className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60"
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
        className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/40 px-4 py-2 text-xs font-bold text-[#0052CC] dark:text-[#579DFF] transition hover:bg-blue-100 dark:hover:bg-blue-900/60"
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

  // Resume & JD Gap Chatbot & PDF Analyzer State
  const [resumeMode, setResumeMode] = useState("pdf"); // 'pdf' | 'text'
  const [jdMode, setJdMode] = useState("text"); // 'text' | 'pdf'
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [resumePdfInfo, setResumePdfInfo] = useState(null); // { fileName, numPages, charCount }
  const [jdPdfInfo, setJdPdfInfo] = useState(null); // { fileName, numPages, charCount }
  const [extractingResumePdf, setExtractingResumePdf] = useState(false);
  const [extractingJdPdf, setExtractingJdPdf] = useState(false);
  const [showResumePreview, setShowResumePreview] = useState(false);
  const [showJdPreview, setShowJdPreview] = useState(false);
  const [profileResumeUploading, setProfileResumeUploading] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [askingFollowUp, setAskingFollowUp] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(true);

  // Drag over states
  const [isDraggingResume, setIsDraggingResume] = useState(false);
  const [isDraggingJd, setIsDraggingJd] = useState(false);

  const resumeFileInputRef = useRef(null);
  const jdFileInputRef = useRef(null);
  const profileResumeInputRef = useRef(null);

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
        // If candidate already has saved resume text, initialize resumeText
        if (data.profile?.resume?.extractedText) {
          setResumeText(data.profile.resume.extractedText);
          if (data.profile.resume.fileName) {
            setResumePdfInfo({
              fileName: data.profile.resume.fileName,
              numPages: 1,
              charCount: data.profile.resume.extractedText.length,
            });
          }
        }
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
      parts.push(
        "Experience:\n" +
          profile.experience
            .map((e) => `- ${e.title} at ${e.company}: ${e.highlights?.join(". ") || e.description || ""}`)
            .join("\n")
      );
    }
    if (profile.projects?.length) {
      parts.push(
        "Projects:\n" +
          profile.projects
            .map((p) => `- ${p.name}: ${p.description || ""} (Tech: ${p.technologies?.join(", ") || ""})`)
            .join("\n")
      );
    }
    if (profile.education?.length) {
      parts.push(
        "Education:\n" +
          profile.education.map((ed) => `- ${ed.degree} from ${ed.institution}`).join("\n")
      );
    }
    setResumeText(parts.join("\n\n"));
    setResumeMode("text");
    setResumePdfInfo(null);
  }

  async function handlePdfExtract(file, target = "resume") {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setAnalysisError("Please select a valid PDF file (.pdf).");
      return;
    }

    if (target === "resume") {
      setExtractingResumePdf(true);
    } else {
      setExtractingJdPdf(true);
    }
    setAnalysisError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/extract-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract text from PDF");

      if (target === "resume") {
        setResumeText(data.text);
        setResumePdfInfo({
          fileName: data.fileName,
          numPages: data.numPages,
          charCount: data.charCount,
        });
        setResumeMode("pdf");
      } else {
        setJdText(data.text);
        setJdPdfInfo({
          fileName: data.fileName,
          numPages: data.numPages,
          charCount: data.charCount,
        });
        setJdMode("pdf");
      }
    } catch (err) {
      setAnalysisError(`PDF Extraction failed: ${err.message}`);
    } finally {
      if (target === "resume") {
        setExtractingResumePdf(false);
      } else {
        setExtractingJdPdf(false);
      }
    }
  }

  async function handleProfileResumeUpload(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setError("Please select a valid PDF file (.pdf).");
      return;
    }
    setProfileResumeUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/extract-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract text from PDF");

      setProfile((prev) => ({
        ...prev,
        resume: {
          ...prev.resume,
          fileName: data.fileName,
          fileType: "pdf",
          extractedText: data.text,
          updatedAt: new Date().toISOString(),
        },
      }));
      setNotice(
        `Extracted text from "${data.fileName}" (${data.numPages} page${data.numPages > 1 ? "s" : ""}, ${data.charCount.toLocaleString()} characters). Click "Save Profile Changes" to save.`
      );
    } catch (err) {
      setError(`Resume PDF upload failed: ${err.message}`);
    } finally {
      setProfileResumeUploading(false);
    }
  }

  async function handleAnalyze(customQuestion = "") {
    const question = typeof customQuestion === "string" ? customQuestion : "";
    if (!jdText.trim()) {
      setAnalysisError("Please provide a Job Description (paste text or upload a JD PDF) to analyze.");
      return;
    }
    if (!resumeText.trim()) {
      setAnalysisError("Please provide your Resume (upload PDF, paste text, or pull from profile).");
      return;
    }
    setAnalyzing(true);
    setAnalysisError("");
    try {
      const res = await fetch("/api/profile/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jdText,
          question,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze resume gap");
      setAnalysisResult(data.analysis);
      setChatMessages((prev) => [
        ...prev,
        ...(question
          ? [{ role: "user", text: question }]
          : [{ role: "user", text: "Analyze my resume vs this job description for gaps and coaching." }]),
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
    "block min-w-0 w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-[#0F172A] dark:text-white placeholder-slate-400 transition focus:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/15";
  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300";

  if (checking || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0F19] text-sm text-slate-400 font-sans">
        Loading…
      </div>
    );
  }

  return (
    <AppLayout user={user}>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 dark:border-slate-800 dark:bg-[#0F172A]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <NavigationSheet user={user} />
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
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

      <main className="mx-auto min-w-0 w-full max-w-6xl flex-1 px-6 pb-16 pt-8">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">Candidate Profile</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#64748B] dark:text-slate-400">
              This is the single source of truth the application tracker, browser-assisted flow,
              and agent all read from when they need your reusable candidate data.
            </p>
          </div>
          <div className="w-full rounded-2xl border border-blue-200/80 bg-white dark:border-slate-800 dark:bg-[#0F172A] p-5 shadow-sm sm:w-auto sm:min-w-[260px]">
            <div className="text-xs font-bold uppercase tracking-wider text-[#0052CC] dark:text-[#579DFF]">
              Profile Completeness
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#0F172A] dark:text-white">{completeness.percent}%</div>
            <div className="mt-1 text-xs text-[#64748B] dark:text-slate-400">
              {completeness.completed} of {completeness.total} key profile areas filled.
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
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
              <p className="rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/40 px-4 py-3 text-sm font-semibold text-rose-900 dark:text-rose-300 shadow-sm">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40 px-4 py-3 text-sm font-semibold text-emerald-900 dark:text-emerald-300 shadow-sm">
                {notice}
              </p>
            )}
          </div>
        )}

        {/* AI Resume vs JD Gap Analyzer & Coach (PDF & Text Multi-Modal) */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-blue-200/80 bg-white dark:border-slate-800 dark:bg-[#0F172A] shadow-sm">
          <div className="border-b border-blue-100 bg-blue-50/50 dark:border-slate-800 dark:bg-slate-900/50 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0052CC] text-white shadow-sm shadow-[#0052CC]/25">
                <BrainCircuit className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
                    AI Resume vs JD Gap Analyzer & Coach
                  </h2>
                  <span className="rounded-full bg-blue-100 dark:bg-blue-900/50 px-2.5 py-0.5 text-[10px] font-extrabold text-[#0052CC] dark:text-[#579DFF]">
                    PDF + Text Support
                  </span>
                </div>
                <p className="text-xs text-[#64748B] dark:text-slate-400">
                  Upload your Resume PDF (or paste text) and target Job Description PDF/text to uncover missing skills, scale gaps, and coaching advice.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAnalyzer((v) => !v)}
              className="text-xs font-semibold text-[#0052CC] dark:text-[#579DFF] hover:underline"
            >
              {showAnalyzer ? "Collapse Analyzer" : "Open Analyzer"}
            </button>
          </div>

          {showAnalyzer && (
            <div className="p-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* 1. RESUME INPUT (PDF or Text) */}
                <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-[#0052CC] dark:text-[#579DFF]" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        1. Your Resume
                      </span>
                    </div>

                    {/* Mode Selector Tabs */}
                    <div className="flex items-center rounded-lg bg-slate-200/80 dark:bg-slate-800 p-0.5 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setResumeMode("pdf")}
                        className={`rounded-md px-2.5 py-1 transition ${
                          resumeMode === "pdf"
                            ? "bg-white dark:bg-[#0F172A] text-[#0052CC] dark:text-[#579DFF] shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        PDF Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setResumeMode("text")}
                        className={`rounded-md px-2.5 py-1 transition ${
                          resumeMode === "text"
                            ? "bg-white dark:bg-[#0F172A] text-[#0052CC] dark:text-[#579DFF] shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        Paste / Edit Text
                      </button>
                    </div>
                  </div>

                  {resumeMode === "pdf" ? (
                    <div className="space-y-3">
                      {/* Hidden File Input */}
                      <input
                        ref={resumeFileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePdfExtract(file, "resume");
                        }}
                      />

                      {/* Dropzone */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingResume(true);
                        }}
                        onDragLeave={() => setIsDraggingResume(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingResume(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handlePdfExtract(file, "resume");
                        }}
                        onClick={() => resumeFileInputRef.current?.click()}
                        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
                          isDraggingResume
                            ? "border-[#0052CC] bg-blue-50/80 dark:bg-blue-950/40"
                            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600"
                        }`}
                      >
                        <UploadCloud className={`h-8 w-8 ${extractingResumePdf ? "animate-bounce text-[#0052CC]" : "text-slate-400"}`} />
                        <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                          {extractingResumePdf ? "Extracting text from PDF..." : "Click or Drag & Drop Resume PDF here"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          Supports standard .pdf files (up to 10MB)
                        </p>
                      </div>

                      {/* PDF Extracted Badge & Actions */}
                      {resumePdfInfo && (
                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 truncate">
                                {resumePdfInfo.fileName}
                              </span>
                              <span className="rounded-md bg-emerald-200/70 dark:bg-emerald-900/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 shrink-0">
                                {resumePdfInfo.numPages} page{resumePdfInfo.numPages > 1 ? "s" : ""} • {resumePdfInfo.charCount.toLocaleString()} chars
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setShowResumePreview((v) => !v)}
                                className="flex items-center gap-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
                              >
                                {showResumePreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                <span>{showResumePreview ? "Hide" : "Preview Text"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setResumePdfInfo(null);
                                  setResumeText("");
                                }}
                                className="rounded-lg p-1 text-slate-400 hover:text-rose-600"
                                title="Remove PDF"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {showResumePreview && (
                            <div className="mt-3 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60">
                              <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                                Extracted Text (Editable):
                              </label>
                              <textarea
                                rows={5}
                                className="w-full rounded-lg border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900 p-2 text-xs text-slate-800 dark:text-slate-200 font-sans"
                                value={resumeText}
                                onChange={(e) => setResumeText(e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {resumeText.length > 0 ? `${resumeText.length.toLocaleString()} characters` : "Empty"}
                        </span>
                        <button
                          type="button"
                          onClick={handleFillFromProfile}
                          className="text-xs font-semibold text-[#0052CC] dark:text-[#579DFF] hover:underline"
                        >
                          + Pull from Saved Profile
                        </button>
                      </div>
                      <textarea
                        rows={7}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/15 font-sans leading-relaxed"
                        placeholder="Paste your full resume text here, or click 'Pull from Saved Profile'..."
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* 2. JOB DESCRIPTION INPUT (PDF or Text) */}
                <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-[#0052CC] dark:text-[#579DFF]" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        2. Target Job Description (JD)
                      </span>
                    </div>

                    {/* Mode Selector Tabs */}
                    <div className="flex items-center rounded-lg bg-slate-200/80 dark:bg-slate-800 p-0.5 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setJdMode("text")}
                        className={`rounded-md px-2.5 py-1 transition ${
                          jdMode === "text"
                            ? "bg-white dark:bg-[#0F172A] text-[#0052CC] dark:text-[#579DFF] shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        Paste Text
                      </button>
                      <button
                        type="button"
                        onClick={() => setJdMode("pdf")}
                        className={`rounded-md px-2.5 py-1 transition ${
                          jdMode === "pdf"
                            ? "bg-white dark:bg-[#0F172A] text-[#0052CC] dark:text-[#579DFF] shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        Upload JD PDF
                      </button>
                    </div>
                  </div>

                  {jdMode === "pdf" ? (
                    <div className="space-y-3">
                      {/* Hidden File Input */}
                      <input
                        ref={jdFileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePdfExtract(file, "jd");
                        }}
                      />

                      {/* Dropzone */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingJd(true);
                        }}
                        onDragLeave={() => setIsDraggingJd(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingJd(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handlePdfExtract(file, "jd");
                        }}
                        onClick={() => jdFileInputRef.current?.click()}
                        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
                          isDraggingJd
                            ? "border-[#0052CC] bg-blue-50/80 dark:bg-blue-950/40"
                            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600"
                        }`}
                      >
                        <FileUp className={`h-8 w-8 ${extractingJdPdf ? "animate-bounce text-[#0052CC]" : "text-slate-400"}`} />
                        <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                          {extractingJdPdf ? "Extracting JD text..." : "Click or Drag & Drop Job Description PDF"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          Upload job spec PDF or job posting document
                        </p>
                      </div>

                      {/* JD PDF Extracted Badge */}
                      {jdPdfInfo && (
                        <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/30 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircle2 className="h-4 w-4 text-[#0052CC] dark:text-[#579DFF] shrink-0" />
                              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 truncate">
                                {jdPdfInfo.fileName}
                              </span>
                              <span className="rounded-md bg-blue-200/70 dark:bg-blue-900/60 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-300 shrink-0">
                                {jdPdfInfo.numPages} page{jdPdfInfo.numPages > 1 ? "s" : ""} • {jdPdfInfo.charCount.toLocaleString()} chars
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setShowJdPreview((v) => !v)}
                                className="flex items-center gap-1 rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-semibold text-blue-800 dark:text-blue-300 hover:bg-blue-100"
                              >
                                {showJdPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                <span>{showJdPreview ? "Hide" : "Preview Text"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setJdPdfInfo(null);
                                  setJdText("");
                                }}
                                className="rounded-lg p-1 text-slate-400 hover:text-rose-600"
                                title="Remove JD PDF"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {showJdPreview && (
                            <div className="mt-3 pt-2 border-t border-blue-200/60 dark:border-blue-900/60">
                              <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-300 mb-1">
                                Extracted JD Text (Editable):
                              </label>
                              <textarea
                                rows={5}
                                className="w-full rounded-lg border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900 p-2 text-xs text-slate-800 dark:text-slate-200 font-sans"
                                value={jdText}
                                onChange={(e) => setJdText(e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {jdText.length > 0 ? `${jdText.length.toLocaleString()} characters` : "Required *"}
                        </span>
                      </div>
                      <textarea
                        rows={7}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/15 font-sans leading-relaxed"
                        placeholder="Paste the job requirements, responsibilities, or entire job description here..."
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {analysisError && (
                <p className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400">{analysisError}</p>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 dark:border-slate-800 pt-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleAnalyze()}
                    disabled={analyzing || !jdText.trim() || !resumeText.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0052CC] px-6 py-3 text-xs font-bold text-white shadow-sm shadow-[#0052CC]/25 transition hover:bg-[#0043A4] hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <Search className={`h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
                    <span>{analyzing ? "Analyzing Resume & JD Gaps with AI..." : "Analyze Resume Gaps with AI"}</span>
                  </button>

                  {(resumeText.trim() || jdText.trim()) && (
                    <button
                      type="button"
                      onClick={() => {
                        setResumeText("");
                        setJdText("");
                        setResumePdfInfo(null);
                        setJdPdfInfo(null);
                        setAnalysisResult(null);
                        setChatMessages([]);
                        setAnalysisError("");
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      Clear Both
                    </button>
                  )}
                </div>

                {analysisResult && (
                  <div className="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 px-4 py-2">
                    <span className="text-xs text-slate-600 dark:text-slate-300">Estimated Match Fit:</span>
                    <span className="text-sm font-extrabold text-[#0052CC] dark:text-[#579DFF]">
                      {analysisResult.matchScore}%
                    </span>
                  </div>
                )}
              </div>

              {/* Chat & Analysis Results Area */}
              {chatMessages.length > 0 && (
                <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50 p-5">
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
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
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/60 text-xs font-bold text-[#0052CC] dark:text-[#579DFF]">
                                AI
                              </span>
                              <div className="flex-1 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#0F172A] p-4 shadow-sm text-xs text-slate-800 dark:text-slate-200">
                                <p className="leading-relaxed font-medium">{msg.text}</p>

                                {msg.analysis && (
                                  <div className="mt-4 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                                    {/* Missing Skills / What is Lacking */}
                                    {msg.analysis.missingSkills?.length > 0 && (
                                      <div>
                                        <h4 className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 text-xs">
                                          <XCircle className="h-3.5 w-3.5" />
                                          <span>What You Are Lacking (Missing Skills & Keywords):</span>
                                        </h4>
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                          {msg.analysis.missingSkills.map((skill, i) => (
                                            <span
                                              key={i}
                                              className="rounded-lg bg-rose-50 border border-rose-200/80 dark:bg-rose-950/40 dark:border-rose-900/60 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 dark:text-rose-300"
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
                                        <h4 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 text-xs">
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          <span>Strong Matches Found:</span>
                                        </h4>
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                          {msg.analysis.matchingSkills.map((skill, i) => (
                                            <span
                                              key={i}
                                              className="rounded-lg bg-emerald-50 border border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-900/60 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300"
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
                                        <h4 className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 text-xs">
                                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                          <span>Experience & Depth Gaps:</span>
                                        </h4>
                                        <ul className="mt-1 list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                                          {msg.analysis.experienceGaps.map((gap, i) => (
                                            <li key={i}>{gap}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Action Recommendations */}
                                    {msg.analysis.recommendations?.length > 0 && (
                                      <div>
                                        <h4 className="font-bold text-[#0052CC] dark:text-[#579DFF] flex items-center gap-1.5 text-xs">
                                          <Lightbulb className="h-3.5 w-3.5" />
                                          <span>Actionable Recommendations:</span>
                                        </h4>
                                        <ul className="mt-1 list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
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
                  <div className="mt-4 flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <input
                      type="text"
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/15"
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
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0043A4] disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{analyzing ? "..." : "Send"}</span>
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
                <label className="md:col-span-2"><span className={labelClass}>Technologies</span><input value={joinList(item.technologies)} onChange={(e) => updateArrayField("projects", index, "technologies", splitList(e.target.value))} placeholder="Next.js, MongoDB, TailwindCSS" className={inputClass} /></label>
              </div>
            )}
          />

          <SectionCard title="Skills" subtitle="Comma-separated technical and soft skills.">
            <label className="block">
              <span className={labelClass}>Skills list</span>
              <input
                value={joinList(profile.skills)}
                onChange={(e) => setProfile((prev) => ({ ...prev, skills: splitList(e.target.value) }))}
                placeholder="JavaScript, React, Node.js, Python, System Design, GraphQL"
                className={inputClass}
              />
            </label>
          </SectionCard>

          <RepeaterSection
            title="Certifications"
            subtitle="Industry credentials and verified learning achievements."
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

          <SectionCard title="Resume Data" subtitle="Upload your Resume PDF to automatically parse and extract text for application forms & AI coach.">
            <div className="space-y-4">
              {/* Direct PDF Upload into Profile */}
              <input
                ref={profileResumeInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProfileResumeUpload(file);
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                    <FileUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Upload & Auto-Extract Resume PDF
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Instantly fills the extracted text below from your PDF document
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => profileResumeInputRef.current?.click()}
                  disabled={profileResumeUploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#0043A4] disabled:opacity-50"
                >
                  <UploadCloud className={`h-4 w-4 ${profileResumeUploading ? "animate-spin" : ""}`} />
                  <span>{profileResumeUploading ? "Extracting Text..." : "Upload Resume PDF"}</span>
                </button>
              </div>

              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <label className="min-w-0"><span className={labelClass}>File name</span><input value={profile.resume.fileName || ""} onChange={(e) => updateResume("fileName", e.target.value)} className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>File type</span><input value={profile.resume.fileType || ""} onChange={(e) => updateResume("fileType", e.target.value)} placeholder="pdf, docx" className={inputClass} /></label>
                <label className="md:col-span-2"><span className={labelClass}>File URL or reference</span><input value={profile.resume.fileUrl || ""} onChange={(e) => updateResume("fileUrl", e.target.value)} className={inputClass} /></label>
                <label className="md:col-span-2"><span className={labelClass}>Extracted resume text</span><textarea value={profile.resume.extractedText || ""} onChange={(e) => updateResume("extractedText", e.target.value)} rows={8} className={inputClass} /></label>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handlePrefillProfile}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/40 px-5 py-3 text-sm font-semibold text-[#0052CC] dark:text-[#579DFF] transition hover:bg-blue-100 dark:hover:bg-blue-900/60 disabled:opacity-60"
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
    </AppLayout>
  );
}
