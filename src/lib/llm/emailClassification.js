// Email intelligence: classify inbound messages by how they relate to a job
// application. Mirrors jobExtraction.js — a schema, prompts, and PURE mapping
// helpers, with the network call isolated in classifyEmails().
//
// To keep it cheap and rate-limit-friendly we classify the WHOLE batch in a
// single generateJSON call: the model returns one { ref, label } per message and
// we map results back by ref, so a dropped or reordered item can't corrupt the
// alignment. Unknown/missing labels fall back to "irrelevant" (low-noise).

import { generateJSON } from "@/lib/llm";
import { EMAIL_CLASSIFICATION, EMAIL_CLASSIFICATION_VALUES } from "@/lib/enums";

// One object with an array inside — Groq's JSON mode returns an object, not a
// bare array, so we wrap it.
const CLASSIFICATION_SCHEMA = {
  type: "object",
  properties: {
    classifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ref: { type: "integer" },
          label: { type: "string", enum: EMAIL_CLASSIFICATION_VALUES },
        },
        required: ["ref", "label"],
      },
    },
  },
  required: ["classifications"],
};

const SYSTEM_PROMPT =
  "You triage a job seeker's email inbox. For each message decide how it relates " +
  "to THAT person's own job applications, using only the sender, subject, and " +
  "preview. Pay close attention to rejection indicators and polite rejection phrasing " +
  "(such as 'unfortunately', 'regret to inform', 'pursuing other candidates', 'decided to move forward with another', " +
  "'will not be advancing', 'position has been filled', 'wish you the best in your search'). " +
  "Be conservative: mass job alerts, newsletters, promotions, and personal mail are 'irrelevant', not real application replies.";

function truncate(value, max) {
  const s = String(value || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// Build the batch prompt. Each message is tagged with a 1-based ref the model
// echoes back. Exported so the alignment contract can be unit-tested.
export function buildUserPrompt(messages) {
  const blocks = messages.map(
    (m, i) =>
      `#${i + 1}\n` +
      `From: ${truncate(m.from, 80)}\n` +
      `Subject: ${truncate(m.subject, 100)}\n` +
      `Preview: ${truncate(m.snippet, 120)}`
  );
  return (
    "Classify each email below into exactly one label:\n" +
    "- interview_invitation: invites you to interview or to schedule a call\n" +
    "- assessment: a coding test, take-home, or online assessment to complete\n" +
    "- offer: a job offer or offer-related message\n" +
    "- rejection: your application was declined, rejected, or not moving forward. Look out for polite rejection cues, synonyms, and phrases such as 'unfortunately', 'regret to inform', 'not moving forward', 'pursuing other candidates', 'more closely aligned', 'decided to move forward with other', 'not selected', 'unable to offer', 'position has been filled/closed', 'wish you the best in your job search', etc.\n" +
    "- general_reply: a real reply about your application that is none of the above (e.g. 'we received it', 'still under review')\n" +
    "- irrelevant: not about your own applications (job alerts, newsletters, promotions, personal mail)\n\n" +
    `Return JSON {"classifications": [{"ref": <the # number>, "label": <one label>}]} ` +
    `with exactly one entry per email (${messages.length} total).\n\n` +
    "EMAILS:\n\n" +
    blocks.join("\n\n")
  );
}

// Coerce any model output into a valid enum value; anything unrecognized becomes
// "irrelevant" so a bad label can never crash the caller.
export function normalizeLabel(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return EMAIL_CLASSIFICATION_VALUES.includes(v)
    ? v
    : EMAIL_CLASSIFICATION.IRRELEVANT;
}

// Map the model's { ref, label } array back to one label per input message, in
// input order. Missing refs default to "irrelevant". Pure + testable.
export function parseClassifications(raw, count) {
  const arr = Array.isArray(raw?.classifications) ? raw.classifications : [];
  const byRef = new Map();
  for (const item of arr) {
    const ref = Number(item?.ref);
    if (Number.isInteger(ref)) byRef.set(ref, normalizeLabel(item?.label));
  }
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(byRef.get(i + 1) || EMAIL_CLASSIFICATION.IRRELEVANT);
  }
  return out;
}

// Rejection synonym and phrase dictionary
const REJECTION_PHRASES = [
  "unfortunately",
  "regret to inform",
  "regret to let you know",
  "we regret",
  "not moving forward",
  "will not be moving forward",
  "won't be moving forward",
  "will not be advancing",
  "not advancing",
  "unable to offer",
  "unable to proceed",
  "unable to move forward",
  "cannot move forward",
  "other candidates",
  "another candidate",
  "more closely aligned",
  "better aligned",
  "pursuing other candidates",
  "decided to pursue other",
  "decided to move forward with other",
  "decided to move forward with another",
  "decided to proceed with other",
  "decided not to move forward",
  "decided not to proceed",
  "not selected",
  "not been selected",
  "at this time, we will not",
  "at this stage, we have decided",
  "position has been filled",
  "role has been filled",
  "position has been closed",
  "role has been closed",
  "job has been closed",
  "declined to move forward",
  "application was not successful",
  "application was unsuccessful",
  "wish you the best in your job search",
  "wish you best in your job search",
  "wish you the best with your job search",
  "wish you the best in your search",
  "wish you success in your job search",
  "wish you all the best in your search",
  "keep your resume on file",
  "keep your profile on file",
  "keep your details on file",
  "after careful consideration, we",
  "after careful review, we have decided",
  "we have chosen to move forward with",
  "impressed with your qualifications, however",
  "impressed with your background, however",
  "high volume of applicants",
  "high volume of applications",
];

// Heuristic classifier for instant classification and fallback
export function classifyByHeuristics(messages) {
  return messages.map((m) => {
    const text = `${m.from || ""} ${m.subject || ""} ${m.snippet || ""}`.toLowerCase();
    if (
      text.includes("offer letter") ||
      text.includes("offer of employment") ||
      text.includes("job offer") ||
      text.includes("formal offer") ||
      text.includes("pleased to offer you") ||
      text.includes("delighted to offer you")
    ) {
      return EMAIL_CLASSIFICATION.OFFER;
    }
    if (
      text.includes("interview") ||
      text.includes("schedule a call") ||
      text.includes("phone screen") ||
      text.includes("speaking with you") ||
      text.includes("next steps with") ||
      text.includes("invitation to connect") ||
      text.includes("availability for a chat") ||
      text.includes("schedule a time") ||
      text.includes("calendly.com")
    ) {
      return EMAIL_CLASSIFICATION.INTERVIEW_INVITATION;
    }
    if (
      text.includes("assessment") ||
      text.includes("hackerrank") ||
      text.includes("codesignal") ||
      text.includes("coding challenge") ||
      text.includes("take-home") ||
      text.includes("technical test") ||
      text.includes("online test") ||
      text.includes("codility") ||
      text.includes("testgorilla")
    ) {
      return EMAIL_CLASSIFICATION.ASSESSMENT;
    }
    if (REJECTION_PHRASES.some((phrase) => text.includes(phrase))) {
      return EMAIL_CLASSIFICATION.REJECTION;
    }
    if (
      text.includes("thank you for applying") ||
      text.includes("application received") ||
      text.includes("we have received your application") ||
      text.includes("under review") ||
      text.includes("application status") ||
      text.includes("application submitted")
    ) {
      return EMAIL_CLASSIFICATION.GENERAL_REPLY;
    }
    return EMAIL_CLASSIFICATION.IRRELEVANT;
  });
}

// Full pipeline: messages -> model -> one enum label per message (input order).
// Empty input short-circuits without an LLM call.
export async function classifyEmails(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  try {
    const raw = await generateJSON({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(messages),
      schema: CLASSIFICATION_SCHEMA,
    });
    const parsed = parseClassifications(raw, messages.length);
    const heuristics = classifyByHeuristics(messages);

    // Merge: if LLM returns irrelevant but heuristics detect a clear signal, promote it
    return parsed.map((label, i) => {
      if (label === EMAIL_CLASSIFICATION.IRRELEVANT && heuristics[i] !== EMAIL_CLASSIFICATION.IRRELEVANT) {
        return heuristics[i];
      }
      return label;
    });
  } catch (err) {
    console.warn("LLM classification fallback to heuristics:", err.message);
    return classifyByHeuristics(messages);
  }
}
