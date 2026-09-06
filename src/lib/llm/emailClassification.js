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
  "preview. Be conservative: mass job alerts, newsletters, promotions, and " +
  "personal mail are 'irrelevant', not real application replies.";

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
    "- rejection: your application was declined / not moving forward\n" +
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

// Heuristic classifier for instant classification and fallback
export function classifyByHeuristics(messages) {
  return messages.map((m) => {
    const text = `${m.from || ""} ${m.subject || ""} ${m.snippet || ""}`.toLowerCase();
    if (
      text.includes("offer letter") ||
      text.includes("offer of employment") ||
      text.includes("job offer") ||
      text.includes("formal offer")
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
      text.includes("availability for a chat")
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
      text.includes("online test")
    ) {
      return EMAIL_CLASSIFICATION.ASSESSMENT;
    }
    if (
      text.includes("unfortunately") ||
      text.includes("not moving forward") ||
      text.includes("other candidates") ||
      text.includes("regret to inform") ||
      text.includes("will not be advancing") ||
      text.includes("decided to proceed with other") ||
      text.includes("position has been filled")
    ) {
      return EMAIL_CLASSIFICATION.REJECTION;
    }
    if (
      text.includes("thank you for applying") ||
      text.includes("application received") ||
      text.includes("we have received your application") ||
      text.includes("under review") ||
      text.includes("application status")
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
