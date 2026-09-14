import { generateJSON } from "../llm/index.js";
import {
  getFullAnalyticsSnapshot,
  queryApplicationsWithFilters,
  getRecentStatusChanges,
  getStaleApplications,
} from "./analyticsEngine.js";

/**
 * System prompt setting up the persona and ground-truth enforcement.
 */
const INTELLIGENCE_SYSTEM_PROMPT = `
You are the CareerFlow "Job Search Intelligence Chatbot" — a specialized AI analyst for the user's job search.
Your primary ground truth is the deterministic analytics and database records provided in the context.

CRITICAL RULES:
1. NEVER hallucinate or guess numbers. All counts, percentages, conversion rates, and company names must match the provided Ground Truth Analytics or database records.
2. Distinguish clearly between OBSERVED FACTS (e.g. "Your referral interview rate is 45%") and HYPOTHESES / RECOMMENDATIONS (e.g. "Since your interview conversion for ML is higher, focusing on ML roles might yield faster results").
3. When asked for status changes, stale applications, or database searches, reference the actual companies and roles provided.
4. If asked for a "Weekly Job Search Report", format it cleanly with structured sections:
   # WEEKLY JOB SEARCH REPORT
   - Applications submitted / active
   - Status changes
   - Funnel highlights
   - Attention items (stale applications)
   - Actionable Strategic Insights
5. Keep answers crisp, structured, engaging, and professional. Use markdown formatting (bolding, bullet points, concise tables when helpful).
6. Always propose 2-3 logical follow-up questions tailored to the user's current analysis.
`.trim();

/**
 * Process a user message against the deterministic analytics engine and Groq LLM.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.message
 * @param {Array} params.history - Array of { role: 'user'|'assistant', content: string }
 */
export async function processChatbotQuery({ userId, message, history = [] }) {
  // 1. Fetch complete deterministic analytics snapshot
  const snapshot = await getFullAnalyticsSnapshot(userId);

  // 2. Classify if query needs specific database filtering (e.g. "Show me all active ML jobs applied on LinkedIn")
  // or specific entity inspection
  let queryFilters = null;
  let applicationResults = [];

  const lowerMsg = message.toLowerCase();

  // Keyword check or intent heuristic for database queries
  const isSearchQuery =
    /show|find|list|search|which jobs|where did i apply|filter/i.test(lowerMsg) &&
    /job|application|applied|linkedin|indeed|referral|active|rejected|interview|stale/i.test(lowerMsg);

  if (isSearchQuery) {
    // Extract filter criteria deterministically or via simple heuristic
    const filters = {};
    if (lowerMsg.includes("active") || lowerMsg.includes("open")) filters.status = "active";
    else if (lowerMsg.includes("rejected")) filters.status = "rejected";
    else if (lowerMsg.includes("interview")) filters.status = "interview";
    else if (lowerMsg.includes("assessment") || lowerMsg.includes("oa")) filters.status = "assessment";
    else if (lowerMsg.includes("offer")) filters.status = "offered";

    if (/machine learning|ml|ai/i.test(lowerMsg)) filters.roleKeyword = "ML";
    else if (/fullstack|full stack/i.test(lowerMsg)) filters.roleKeyword = "Full Stack";
    else if (/frontend|front end/i.test(lowerMsg)) filters.roleKeyword = "Frontend";
    else if (/backend|back end/i.test(lowerMsg)) filters.roleKeyword = "Backend";

    if (lowerMsg.includes("linkedin")) filters.sourcePlatform = "linkedin";
    else if (lowerMsg.includes("indeed")) filters.sourcePlatform = "indeed";
    else if (lowerMsg.includes("referral")) filters.sourcePlatform = "referral";
    else if (lowerMsg.includes("career")) filters.sourcePlatform = "career_page";

    queryFilters = filters;
    applicationResults = await queryApplicationsWithFilters(userId, filters);
  } else if (/stale|waiting|no response|silent|pending/i.test(lowerMsg)) {
    const staleApps = await getStaleApplications(userId, 14);
    applicationResults = staleApps.map((s) => ({
      id: s.id,
      companyName: s.companyName,
      roleTitle: s.roleTitle,
      currentStatus: s.currentStatus,
      daysSince: s.daysSince,
      applicationDate: s.appliedDate,
    }));
  }

  // 3. Format context payload for LLM
  const contextData = {
    analyticsSnapshot: snapshot,
    databaseSearchResults: applicationResults.length > 0 ? applicationResults : null,
    recentStatusChanges: snapshot.recentChanges,
    staleApplications: snapshot.staleApplications,
  };

  const schema = {
    type: "object",
    properties: {
      reply: {
        type: "string",
        description: "The formatted markdown response to the user's question, grounded strictly in the analytics data.",
      },
      intent: {
        type: "string",
        description: "Categorized user intent, e.g.: funnel_analysis, status_query, rejection_analysis, role_comparison, source_analysis, focus_recommendation, weekly_report, database_search, general_inquiry",
      },
      keyMetrics: {
        type: "object",
        description: "Key metrics referenced in this specific answer, e.g. { totalApplications: 45, conversionRate: '18.2%' }",
      },
      suggestedFollowUps: {
        type: "array",
        items: { type: "string" },
        description: "2 to 3 contextual follow-up questions the user might want to ask next.",
      },
    },
    required: ["reply", "intent", "suggestedFollowUps"],
  };

  // Build the prompt including recent conversational context
  const recentTurns = history.slice(-4).map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`).join("\n");

  const userPrompt = `
CONVERSATION HISTORY (Last turns):
${recentTurns || "No prior history"}

CURRENT USER QUESTION:
"${message}"

DETERMINISTIC GROUND TRUTH DATA:
${JSON.stringify(contextData, null, 2)}

INSTRUCTIONS:
1. Provide a direct, data-backed answer using the numbers in the GROUND TRUTH DATA.
2. If the user asks for a report, comparison, or advice, follow the specific structured format.
3. If search results or stale applications are present, summarize them and highlight key entries.
4. Output valid JSON adhering to the specified schema.
`.trim();

  try {
    const response = await generateJSON({
      system: INTELLIGENCE_SYSTEM_PROMPT,
      user: userPrompt,
      schema,
    });

    return {
      reply: response.reply || "I reviewed your data, but could not generate a formatted answer.",
      intent: response.intent || "general_inquiry",
      keyMetrics: response.keyMetrics || {},
      suggestedFollowUps: response.suggestedFollowUps || [
        "How is my application funnel performing?",
        "Which job roles give me the highest interview rate?",
        "What should I focus on to improve conversion?",
      ],
      applicationResults: applicationResults.slice(0, 10),
    };
  } catch (error) {
    console.error("Chatbot generation error:", error);

    // Deterministic fallback response if LLM encounters transient provider issue
    return {
      reply: `Here is a summary from your application database:\n\n` +
        `• **Total Applications:** ${snapshot.summary.total}\n` +
        `• **Active Applications:** ${snapshot.summary.active}\n` +
        `• **Interviews Reached:** ${snapshot.summary.interviews}\n` +
        `• **Offers:** ${snapshot.summary.offers}\n` +
        `• **Top Role by Conversion:** ${snapshot.summary.bestRole}\n` +
        `• **Biggest Funnel Bottleneck:** ${snapshot.summary.biggestBottleneck}\n\n` +
        `*(Deterministic fallback response)*`,
      intent: "status_query",
      keyMetrics: snapshot.summary,
      suggestedFollowUps: [
        "Show my application funnel breakdown",
        "Which sources perform best for me?",
        "What changed this week?",
      ],
      applicationResults: applicationResults.slice(0, 10),
    };
  }
}
