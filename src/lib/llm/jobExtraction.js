import { generateJSON } from "@/lib/llm";
import { SOURCE_PLATFORM } from "@/lib/enums";

// The JSON shape the local model must fill. Kept deliberately small and flat —
// small models are far more reliable when every field is simple and described.
const JOB_SCHEMA = {
  type: "object",
  properties: {
    companyName: { type: "string" },
    roleTitle: { type: "string" },
    location: { type: "string" },
    employmentType: { type: "string" },
    seniority: { type: "string" },
    keyRequirements: { type: "array", items: { type: "string" } },
    jobUrl: { type: "string" },
    summary: { type: "string" },
  },
  required: ["companyName", "roleTitle"],
};

const SYSTEM_PROMPT =
  "You extract structured data from job postings. Copy facts verbatim from the " +
  "posting and never invent a company, title, or URL. If a field is not present " +
  "in the text, use an empty string (or an empty array for lists).";

function buildUserPrompt(rawText) {
  return (
    "Extract these fields from the job posting below.\n" +
    "- companyName: the hiring company\n" +
    "- roleTitle: the job title\n" +
    "- location: city/country, or 'Remote' if stated\n" +
    "- employmentType: e.g. Full-time, Internship, Contract\n" +
    "- seniority: e.g. Intern, New Grad, Junior, Mid, Senior\n" +
    "- keyRequirements: up to 6 core skills/qualifications as short phrases\n" +
    "- jobUrl: only if a URL literally appears in the text; otherwise empty\n" +
    "- summary: one plain sentence describing the role\n\n" +
    "JOB POSTING:\n" +
    rawText
  );
}

// Job-board domain -> our source enum. Deterministic: we don't trust the model
// to know our internal values, so we derive the platform from any URL ourselves.
const DOMAIN_TO_SOURCE = [
  ["greenhouse.io", SOURCE_PLATFORM.GREENHOUSE],
  ["lever.co", SOURCE_PLATFORM.LEVER],
  ["myworkdayjobs.com", SOURCE_PLATFORM.WORKDAY],
  ["workday.com", SOURCE_PLATFORM.WORKDAY],
  ["linkedin.com", SOURCE_PLATFORM.LINKEDIN],
  ["wellfound.com", SOURCE_PLATFORM.WELLFOUND],
  ["angel.co", SOURCE_PLATFORM.WELLFOUND],
];

// Pasted text with no recognizable job-board URL is a "manual" intake.
export function inferSource(jobUrl) {
  if (!jobUrl) return SOURCE_PLATFORM.MANUAL;
  const url = String(jobUrl).toLowerCase();
  for (const [domain, source] of DOMAIN_TO_SOURCE) {
    if (url.includes(domain)) return source;
  }
  return SOURCE_PLATFORM.MANUAL;
}

// Fold the rich extras into a single notes blob we persist. Pure + testable.
export function buildNotes({
  summary,
  location,
  employmentType,
  seniority,
  keyRequirements,
} = {}) {
  const lines = [];
  if (summary) lines.push(String(summary).trim());

  const facts = [];
  if (location) facts.push(`Location: ${String(location).trim()}`);
  if (employmentType) facts.push(`Type: ${String(employmentType).trim()}`);
  if (seniority) facts.push(`Level: ${String(seniority).trim()}`);
  if (facts.length) lines.push(facts.join(" · "));

  if (Array.isArray(keyRequirements) && keyRequirements.length) {
    const reqs = keyRequirements
      .map((r) => String(r).trim())
      .filter(Boolean)
      .join(", ");
    if (reqs) lines.push(`Key requirements: ${reqs}`);
  }

  return lines.join("\n");
}

// Turn a raw model extraction into the exact shape the add-application form and
// POST /api/applications expect. Pure — no network — so it's unit-testable.
export function toApplicationFields(raw = {}) {
  const companyName = String(raw.companyName || "").trim();
  const roleTitle = String(raw.roleTitle || "").trim();
  const jobUrl = String(raw.jobUrl || "").trim();
  return {
    companyName,
    roleTitle,
    sourcePlatform: inferSource(jobUrl),
    jobUrl,
    notes: buildNotes(raw),
  };
}

// Full pipeline: raw text -> local model -> validated application fields.
export async function extractJobPosting(rawText) {
  const raw = await generateJSON({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(rawText),
    schema: JOB_SCHEMA,
  });
  const fields = toApplicationFields(raw);
  if (!fields.companyName || !fields.roleTitle) {
    throw new Error(
      "Couldn't find a clear company and role in that text — paste the main job description."
    );
  }
  return fields;
}
