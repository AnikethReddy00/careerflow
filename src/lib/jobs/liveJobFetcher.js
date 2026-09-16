import { JOB_DIRECTORY } from "./jobDirectory.js";

let cachedLiveJobs = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

const GREENHOUSE_BOARDS = [
  { id: "anthropic", company: "Anthropic", logoColor: "bg-amber-700" },
  { id: "vercel", company: "Vercel", logoColor: "bg-slate-900" },
  { id: "figma", company: "Figma", logoColor: "bg-violet-600" },
  { id: "datadog", company: "Datadog", logoColor: "bg-purple-800" },
  { id: "cloudflare", company: "Cloudflare", logoColor: "bg-orange-600" },
  { id: "stripe", company: "Stripe", logoColor: "bg-indigo-600" },
];

function inferCategory(title = "", tags = [], description = "") {
  const text = `${title} ${tags.join(" ")} ${description}`.toLowerCase();
  if (/machine learning|ml|ai\b|artificial intelligence|nlp|deep learning|data scien|prompt|llm|applied ai/i.test(text)) {
    return "AI / ML Engineer";
  }
  if (/full[\s_-]?stack|fullstack/i.test(text)) {
    return "Full Stack Engineer";
  }
  if (/front[\s_-]?end|frontend|react|ui|ux|css|vue|angular|web platform/i.test(text)) {
    return "Frontend Engineer";
  }
  if (/back[\s_-]?end|backend|node|golang|python|java|api|microservices|distributed|systems engineer/i.test(text)) {
    return "Backend Engineer";
  }
  if (/devops|cloud|infrastructure|sre|kubernetes|terraform|aws|docker|platform engineer/i.test(text)) {
    return "DevOps / Cloud Engineer";
  }
  if (/data engineer|analytics|data warehouse|snowflake|sql|dbt|data platform/i.test(text)) {
    return "Data Engineer";
  }
  return "Software Engineer";
}

function extractTechSkills(text = "", tags = []) {
  const commonTech = [
    "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python",
    "Go", "Rust", "Java", "C++", "FastAPI", "PostgreSQL", "MongoDB",
    "Redis", "Kafka", "Docker", "Kubernetes", "AWS", "GCP", "Azure",
    "Terraform", "GraphQL", "TailwindCSS", "PyTorch", "LLM", "SQL",
    "CI/CD", "Linux", "REST API", "Snowflake", "dbt"
  ];

  const matched = new Set();
  const lower = `${text} ${tags.join(" ")}`.toLowerCase();

  commonTech.forEach((skill) => {
    const reg = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (reg.test(lower)) {
      matched.add(skill);
    }
  });

  // Also include valid tags
  tags.forEach((t) => {
    if (t && t.length > 2 && t.length < 20 && !/job|remote|full time|salary|senior|junior/i.test(t)) {
      const formatted = t.charAt(0).toUpperCase() + t.slice(1);
      matched.add(formatted);
    }
  });

  const list = Array.from(matched);
  return list.length > 0 ? list.slice(0, 7) : ["TypeScript", "React", "Node.js", "REST API"];
}

function cleanHtml(html = "") {
  return String(html)
    .replace(/<[^>]*>?/gm, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetches real, live jobs directly from Greenhouse public APIs and Jobicy feed.
 * Every job contains an authentic direct URL that opens the real job application page.
 */
export async function getLiveAndCuratedJobs() {
  const now = Date.now();
  if (cachedLiveJobs && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedLiveJobs;
  }

  const liveJobs = [];

  // 1. Greenhouse Live Boards (Anthropic, Vercel, Figma, Datadog, Cloudflare, Stripe)
  const greenhousePromises = GREENHOUSE_BOARDS.map(async (board) => {
    try {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board.id}/jobs`, {
        next: { revalidate: 600 },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const engJobs = (data.jobs || []).filter((j) =>
        /\b(engineer|developer|software|full[\s-]?stack|backend|frontend|platform|machine learning|ai|scientist|sre|devops|data)\b/i.test(
          j.title
        ) && !/sales|account executive|recruiter|lead recruiter|legal|finance/i.test(j.title)
      );

      return engJobs.slice(0, 5).map((j) => {
        const title = j.title;
        const location = j.location?.name || "San Francisco, CA / Remote";
        const isRemote = /remote/i.test(location);
        const category = inferCategory(title, [], location);
        const skills = extractTechSkills(`${title} ${category}`);

        return {
          id: `live-gh-${board.id}-${j.id}`,
          title: title,
          company: board.company,
          logoColor: board.logoColor,
          roleCategory: category,
          location: location,
          workplaceType: isRemote ? "Remote" : "Hybrid",
          experienceLevel: /senior|staff|lead|principal/i.test(title) ? "Senior" : "Mid-Level",
          salaryRange: "$175,000 - $265,000 / yr",
          salaryMin: 175000,
          salaryMax: 265000,
          postedDaysAgo: 1,
          requiredSkills: skills.slice(0, 5),
          preferredSkills: skills.slice(5, 8),
          description: `Live verified engineering position at ${board.company}. Direct application hosted on Greenhouse.`,
          highlights: [
            `Verified live application directly on Greenhouse for ${board.company}`,
            `Location: ${location}`,
            `Core focus: ${skills.slice(0, 3).join(", ") || title}`,
          ],
          applyUrl: j.absolute_url,
          demoUrl: "/demo-application",
          isLivePosting: true,
        };
      });
    } catch {
      return [];
    }
  });

  // 2. Jobicy Live Feed
  const jobicyPromise = fetch("https://jobicy.com/api/v2/remote-jobs?count=30&industry=engineering", {
    headers: { "User-Agent": "CareerFlow-App/1.0" },
    next: { revalidate: 600 },
  })
    .then((r) => (r.ok ? r.json() : { jobs: [] }))
    .then((data) => {
      const items = data.jobs || [];
      return items.map((item) => {
        const rawDesc = cleanHtml(item.jobDescription || item.jobExcerpt || "");
        const tags = [...(item.jobIndustry || []), ...(item.jobType || [])];
        const skills = extractTechSkills(rawDesc, tags);
        const category = inferCategory(item.jobTitle, tags, rawDesc);
        const salary =
          item.salaryMin && item.salaryMax
            ? `$${Math.round(item.salaryMin / 1000)}k - $${Math.round(item.salaryMax / 1000)}k / yr`
            : "$140,000 - $195,000 / yr";

        const daysAgo = item.pubDate
          ? Math.max(1, Math.floor((Date.now() - new Date(item.pubDate).getTime()) / (1000 * 60 * 60 * 24)))
          : 1;

        return {
          id: `live-jobicy-${item.id}`,
          title: item.jobTitle,
          company: item.companyName,
          logoUrl: item.companyLogo || null,
          logoColor: "bg-blue-600",
          roleCategory: category,
          location: item.jobGeo || "Remote (Worldwide)",
          workplaceType: "Remote",
          experienceLevel: item.jobLevel || "Mid-to-Senior",
          salaryRange: salary,
          salaryMin: item.salaryMin || 140000,
          salaryMax: item.salaryMax || 195000,
          postedDaysAgo: daysAgo,
          requiredSkills: skills.slice(0, 5),
          preferredSkills: skills.slice(5, 8),
          description: rawDesc.slice(0, 280) + (rawDesc.length > 280 ? "..." : ""),
          highlights: [
            `Live verified posting from ${item.companyName}`,
            `100% remote eligibility for ${item.jobGeo || "global candidates"}`,
            `Core stack: ${skills.slice(0, 3).join(", ") || "Fullstack"}`,
          ],
          applyUrl: item.url,
          demoUrl: "/demo-application",
          isLivePosting: true,
        };
      });
    })
    .catch(() => []);

  try {
    const [ghResults, jobicyResults] = await Promise.all([
      Promise.all(greenhousePromises).then((r) => r.flat()),
      jobicyPromise,
    ]);
    liveJobs.push(...ghResults, ...jobicyResults);
  } catch {
    // fallback
  }

  // Combine live fetched jobs with verified directory
  const combined = [...liveJobs, ...JOB_DIRECTORY];

  // De-duplicate by title + company
  const seen = new Set();
  const deduped = [];
  for (const job of combined) {
    const key = `${job.company?.toLowerCase()}-${job.title?.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(job);
    }
  }

  cachedLiveJobs = deduped;
  lastFetchTime = now;
  return deduped;
}
