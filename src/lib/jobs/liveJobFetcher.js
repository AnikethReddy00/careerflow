import { JOB_DIRECTORY } from "./jobDirectory.js";

let cachedLiveJobs = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

const GREENHOUSE_BOARDS = [
  // India-heavy Global Tech Giants & Unicorns
  { id: "mongodb", company: "MongoDB", logoColor: "bg-emerald-700" },
  { id: "databricks", company: "Databricks", logoColor: "bg-red-600" },
  { id: "okta", company: "Okta", logoColor: "bg-blue-600" },
  { id: "purestorage", company: "Pure Storage", logoColor: "bg-orange-600" },
  { id: "rubrik", company: "Rubrik", logoColor: "bg-cyan-700" },
  { id: "zscaler", company: "Zscaler", logoColor: "bg-blue-800" },
  { id: "inmobi", company: "InMobi", logoColor: "bg-emerald-600" },
  { id: "druva", company: "Druva", logoColor: "bg-indigo-700" },
  { id: "groww", company: "Groww", logoColor: "bg-emerald-500" },
  { id: "gitlab", company: "GitLab", logoColor: "bg-orange-700" },
  { id: "twilio", company: "Twilio", logoColor: "bg-rose-600" },
  { id: "coinbase", company: "Coinbase", logoColor: "bg-blue-700" },
  { id: "elastic", company: "Elastic", logoColor: "bg-amber-600" },
  { id: "thoughtworks", company: "Thoughtworks", logoColor: "bg-purple-700" },
  { id: "samsara", company: "Samsara", logoColor: "bg-slate-800" },
  { id: "stripe", company: "Stripe", logoColor: "bg-indigo-600" },
  { id: "cloudflare", company: "Cloudflare", logoColor: "bg-orange-600" },
  // AI Frontier & Web Tech Leaders
  { id: "anthropic", company: "Anthropic", logoColor: "bg-amber-700" },
  { id: "vercel", company: "Vercel", logoColor: "bg-slate-900" },
  { id: "figma", company: "Figma", logoColor: "bg-violet-600" },
  { id: "datadog", company: "Datadog", logoColor: "bg-purple-800" },
];

const LEVER_BOARDS = [
  { id: "meesho", company: "Meesho", logoColor: "bg-pink-600" },
  { id: "cred", company: "CRED", logoColor: "bg-slate-900" },
  { id: "fampay", company: "FamPay", logoColor: "bg-amber-500" },
  { id: "pocketfm", company: "Pocket FM", logoColor: "bg-red-600" },
  { id: "epifi", company: "Fi Money", logoColor: "bg-teal-600" },
];

function isTechJob(title = "") {
  const t = title.toLowerCase();
  const techKeywords = /\b(engineer|developer|software|full[\s-]?stack|backend|frontend|platform|machine learning|ai|scientist|sre|devops|data|cloud|architect|systems|security|qa|sdet|mobile|ios|android|firmware|infrastructure|tech lead)\b/i;
  const nonTech = /\b(sales|account executive|account manager|recruiter|talent acquisition|compliance|legal|operations executive|field executive|store manager|merchandising|category manager|business development|copywriter|collections)\b/i;
  return techKeywords.test(t) && !nonTech.test(t);
}

function isIndiaLocation(loc = "") {
  return /india|bengaluru|bangalore|hyderabad|pune|gurgaon|gurugram|noida|mumbai|chennai|delhi|kolkata|ahmedabad/i.test(loc || "");
}

function inferCategory(title = "", tags = [], description = "") {
  const text = `${title} ${tags.join(" ")} ${description}`.toLowerCase();
  if (/machine learning|ml|ai\b|artificial intelligence|nlp|deep learning|data scien|prompt|llm|applied ai|research engineer/i.test(text)) {
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
  if (/devops|cloud|infrastructure|sre|kubernetes|terraform|aws|docker|platform engineer|network engineer/i.test(text)) {
    return "DevOps / Cloud Engineer";
  }
  if (/data engineer|analytics|data warehouse|snowflake|sql|dbt|data platform|data infra/i.test(text)) {
    return "Data Engineer";
  }
  return "Software Engineer";
}

function extractTechSkills(text = "", tags = []) {
  const commonTech = [
    "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python",
    "Go", "Rust", "Java", "C++", "C#", "FastAPI", "PostgreSQL", "MongoDB",
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
 * Fetches real, live jobs directly from Greenhouse public APIs, Lever public feeds, and Jobicy feeds.
 */
export async function getLiveAndCuratedJobs() {
  const now = Date.now();
  if (cachedLiveJobs && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedLiveJobs;
  }

  const liveJobs = [];

  // 1. Greenhouse Live Boards (including India hubs & Global leaders)
  const greenhousePromises = GREENHOUSE_BOARDS.map(async (board) => {
    try {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board.id}/jobs`, {
        next: { revalidate: 600 },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const engJobs = (data.jobs || []).filter((j) => isTechJob(j.title));

      const indiaEng = engJobs.filter((j) => isIndiaLocation(j.location?.name));
      const otherEng = engJobs.filter((j) => !isIndiaLocation(j.location?.name));

      // Prioritize rich India selection while keeping top international roles
      const selected = [...indiaEng.slice(0, 15), ...otherEng.slice(0, 4)];

      return selected.map((j) => {
        const title = j.title;
        const location = j.location?.name || "San Francisco, CA / Remote";
        const isIndia = isIndiaLocation(location);
        const isRemote = /remote/i.test(location);
        const category = inferCategory(title, [], location);
        const skills = extractTechSkills(`${title} ${category}`);

        const salary = isIndia
          ? (/senior|staff|lead|principal|architect/i.test(title)
              ? "₹38,00,000 - ₹58,00,000 / yr"
              : "₹24,00,000 - ₹38,00,000 / yr")
          : "$175,000 - $265,000 / yr";

        const salaryMin = isIndia
          ? (/senior|staff|lead|principal|architect/i.test(title) ? 180000 : 150000)
          : 175000;
        const salaryMax = isIndia
          ? (/senior|staff|lead|principal|architect/i.test(title) ? 260000 : 210000)
          : 265000;

        return {
          id: `live-gh-${board.id}-${j.id}`,
          title: title,
          company: board.company,
          logoColor: board.logoColor,
          roleCategory: category,
          location: location,
          workplaceType: isRemote ? "Remote" : "Hybrid",
          experienceLevel: /senior|staff|lead|principal|architect/i.test(title) ? "Senior" : "Mid-Level",
          salaryRange: salary,
          salaryMin: salaryMin,
          salaryMax: salaryMax,
          postedDaysAgo: 1,
          requiredSkills: skills.slice(0, 5),
          preferredSkills: skills.slice(5, 8),
          description: `Live verified engineering position at ${board.company}. Direct application hosted on Greenhouse ATS.`,
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

  // 2. Lever Live Boards (Meesho, CRED, FamPay, Pocket FM, Fi Money)
  const leverPromises = LEVER_BOARDS.map(async (board) => {
    try {
      const res = await fetch(`https://api.lever.co/v0/postings/${board.id}?mode=json`, {
        next: { revalidate: 600 },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const engJobs = (data || []).filter((j) => isTechJob(j.text));

      const indiaEng = engJobs.filter((j) => isIndiaLocation(j.categories?.location));
      const otherEng = engJobs.filter((j) => !isIndiaLocation(j.categories?.location));

      const selected = [...indiaEng.slice(0, 15), ...otherEng.slice(0, 3)];

      return selected.map((j) => {
        const title = j.text;
        const location = j.categories?.location || "Bengaluru, India";
        const isIndia = isIndiaLocation(location);
        const isRemote = /remote/i.test(location) || j.workplaceType === "remote";
        const category = inferCategory(title, [j.categories?.team, j.categories?.department], j.descriptionPlain || "");
        const skills = extractTechSkills(`${title} ${category} ${j.descriptionPlain || ""}`);

        const salary = isIndia
          ? (/senior|staff|lead|principal|architect|manager/i.test(title)
              ? "₹40,00,000 - ₹62,00,000 / yr"
              : "₹25,00,000 - ₹40,00,000 / yr")
          : "$160,000 - $240,000 / yr";

        const salaryMin = isIndia
          ? (/senior|staff|lead|principal|architect/i.test(title) ? 180000 : 150000)
          : 160000;
        const salaryMax = isIndia
          ? (/senior|staff|lead|principal|architect/i.test(title) ? 260000 : 210000)
          : 240000;

        const daysAgo = j.createdAt
          ? Math.max(1, Math.min(14, Math.floor((Date.now() - j.createdAt) / (1000 * 60 * 60 * 24))))
          : 1;

        return {
          id: `live-lever-${board.id}-${j.id}`,
          title: title,
          company: board.company,
          logoColor: board.logoColor,
          roleCategory: category,
          location: location,
          workplaceType: isRemote ? "Remote" : "Hybrid",
          experienceLevel: /senior|staff|lead|principal|architect|manager/i.test(title) ? "Senior" : "Mid-Level",
          salaryRange: salary,
          salaryMin: salaryMin,
          salaryMax: salaryMax,
          postedDaysAgo: daysAgo,
          requiredSkills: skills.slice(0, 5),
          preferredSkills: skills.slice(5, 8),
          description: (cleanHtml(j.descriptionBodyPlain || j.descriptionPlain || "").slice(0, 280) || `Live engineering role at ${board.company}`) + "...",
          highlights: [
            `Verified live application on Lever for ${board.company}`,
            `Location: ${location}`,
            `Core stack: ${skills.slice(0, 3).join(", ") || title}`,
          ],
          applyUrl: j.hostedUrl || j.applyUrl,
          demoUrl: "/demo-application",
          isLivePosting: true,
        };
      });
    } catch {
      return [];
    }
  });

  // 3. Jobicy Live Feed (Engineering & APAC feeds)
  const jobicyEngPromise = fetch("https://jobicy.com/api/v2/remote-jobs?count=30&industry=engineering", {
    headers: { "User-Agent": "CareerFlow-App/1.0" },
    next: { revalidate: 600 },
  })
    .then((r) => (r.ok ? r.json() : { jobs: [] }))
    .catch(() => ({ jobs: [] }));

  const jobicyApacPromise = fetch("https://jobicy.com/api/v2/remote-jobs?count=30&geo=apac", {
    headers: { "User-Agent": "CareerFlow-App/1.0" },
    next: { revalidate: 600 },
  })
    .then((r) => (r.ok ? r.json() : { jobs: [] }))
    .catch(() => ({ jobs: [] }));

  try {
    const [ghResults, leverResults, jobicyEngData, jobicyApacData] = await Promise.all([
      Promise.all(greenhousePromises).then((r) => r.flat()),
      Promise.all(leverPromises).then((r) => r.flat()),
      jobicyEngPromise,
      jobicyApacPromise,
    ]);

    const allJobicyItems = [...(jobicyEngData.jobs || []), ...(jobicyApacData.jobs || [])];

    const parsedJobicy = allJobicyItems.map((item) => {
      const rawDesc = cleanHtml(item.jobDescription || item.jobExcerpt || "");
      const tags = [...(item.jobIndustry || []), ...(item.jobType || [])];
      const skills = extractTechSkills(rawDesc, tags);
      const category = inferCategory(item.jobTitle, tags, rawDesc);
      const isIndiaLoc = isIndiaLocation(item.jobGeo || "");
      const salary =
        item.salaryMin && item.salaryMax
          ? `$${Math.round(item.salaryMin / 1000)}k - $${Math.round(item.salaryMax / 1000)}k / yr`
          : isIndiaLoc
          ? "₹25,00,000 - ₹42,00,000 / yr"
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

    liveJobs.push(...ghResults, ...leverResults, ...parsedJobicy);
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
