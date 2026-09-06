import { generateJSON } from "@/lib/llm";

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    draftText: { type: "string" },
  },
  required: ["subject", "draftText"],
};

const SYSTEM_PROMPT =
  "You write polite, concise, professional follow-up emails for job applicants. " +
  "Keep the email brief (3 to 5 sentences), cordial, and customized to the role and company. " +
  "Never sound demanding or desperate. Sound enthusiastic and respectful of the recruiter's time.";

export function buildFallbackDraft(application, candidateContext) {
  const applied = application.applicationDate
    ? new Date(application.applicationDate).toLocaleDateString()
    : "recently";
  const firstName = candidateContext?.personal?.firstName || "";
  const fullName = [
    candidateContext?.personal?.firstName,
    candidateContext?.personal?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const subject = `Following up — ${application.roleTitle} application`;
  const draftText =
    `${firstName ? `Hi ${firstName},` : "Hi,"}\n\n` +
    `I wanted to follow up on my application for the ${application.roleTitle} ` +
    `role at ${application.companyName} (submitted ${applied}). I remain very ` +
    `interested in the team's work and would welcome any update on the timeline.\n\n` +
    `Thank you for your time and consideration.\n\nBest regards${
      fullName ? `,\n${fullName}` : ""
    }`;

  return { subject, draftText };
}

export async function generateFollowUpDraft({ application, candidateContext, followUpNumber = 1 }) {
  const applied = application.applicationDate
    ? new Date(application.applicationDate).toLocaleDateString()
    : "recently";
  const fullName = [
    candidateContext?.personal?.firstName,
    candidateContext?.personal?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const skills = Array.isArray(candidateContext?.skills)
    ? candidateContext.skills.slice(0, 4).join(", ")
    : "";

  const userPrompt =
    `Write a follow-up email (follow-up #${followUpNumber}) from a candidate to a recruiter/hiring team.\n\n` +
    `Details:\n` +
    `- Candidate Name: ${fullName || "Applicant"}\n` +
    `- Relevant Candidate Skills: ${skills || "Software Engineering"}\n` +
    `- Company: ${application.companyName}\n` +
    `- Role: ${application.roleTitle}\n` +
    `- Applied Date: ${applied}\n` +
    `- Current Stage: ${application.currentStatus || "Applied"}\n\n` +
    `Return a single JSON object with "subject" and "draftText". The body must include greeting and signature.`;

  try {
    const res = await generateJSON({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      schema: DRAFT_SCHEMA,
    });

    if (res?.subject && res?.draftText) {
      return {
        subject: String(res.subject).trim(),
        draftText: String(res.draftText).trim(),
      };
    }
  } catch (err) {
    console.warn("Local LLM follow-up generation failed, using fallback:", err.message);
  }

  return buildFallbackDraft(application, candidateContext);
}
