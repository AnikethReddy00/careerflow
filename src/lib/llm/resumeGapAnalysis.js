import { generateJSON } from "@/lib/llm";

const GAP_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    matchScore: { type: "integer" },
    summary: { type: "string" },
    missingSkills: {
      type: "array",
      items: { type: "string" },
    },
    matchingSkills: {
      type: "array",
      items: { type: "string" },
    },
    experienceGaps: {
      type: "array",
      items: { type: "string" },
    },
    recommendations: {
      type: "array",
      items: { type: "string" },
    },
    botResponse: { type: "string" },
  },
  required: [
    "matchScore",
    "summary",
    "missingSkills",
    "matchingSkills",
    "recommendations",
    "botResponse",
  ],
};

const SYSTEM_PROMPT =
  "You are an expert technical career coach and resume reviewer. " +
  "Analyze the candidate's resume text against the provided Job Description (JD). " +
  "Be honest, constructive, and direct. Point out specifically what technologies, skills, or experience depths the candidate is lacking, and how they can bridge the gap.";

export async function analyzeResumeGap({ resumeText, jdText, question = "" }) {
  const userPrompt =
    `Perform a thorough gap analysis between this Resume and Job Description.\n\n` +
    `RESUME CONTENT:\n${resumeText.slice(0, 7000)}\n\n` +
    `JOB DESCRIPTION:\n${jdText.slice(0, 5000)}\n\n` +
    (question ? `CANDIDATE'S SPECIFIC QUESTION: ${question}\n\n` : "") +
    `Return a JSON object with:\n` +
    `- "matchScore": integer from 0 to 100 estimated fit\n` +
    `- "summary": 2-3 sentences summarizing fit and main gaps\n` +
    `- "missingSkills": list of specific hard/soft skills required by JD that are absent or weak in the resume\n` +
    `- "matchingSkills": list of strong skills present in both\n` +
    `- "experienceGaps": list of missing project types, scale, leadership, or domain experience\n` +
    `- "recommendations": 3-5 concrete action points to improve chances for this role\n` +
    `- "botResponse": friendly conversational response addressing what the candidate is lacking and answering their query.`;

  const result = await generateJSON({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    schema: GAP_ANALYSIS_SCHEMA,
  });

  return result;
}
