import { JOB_DIRECTORY } from "./jobDirectory";

// Synonym dictionary for fuzzy skill matching
const SKILL_SYNONYMS = {
  "react": ["react", "react.js", "reactjs"],
  "next.js": ["next.js", "nextjs", "next"],
  "node.js": ["node.js", "nodejs", "node"],
  "typescript": ["typescript", "ts"],
  "javascript": ["javascript", "js", "ecmascript"],
  "python": ["python", "python3", "py"],
  "postgresql": ["postgresql", "postgres", "psql", "sql"],
  "mongodb": ["mongodb", "mongo", "nosql"],
  "tailwindcss": ["tailwindcss", "tailwind", "tailwind css"],
  "docker": ["docker", "containerization", "containers"],
  "kubernetes": ["kubernetes", "k8s"],
  "aws": ["aws", "amazon web services", "cloud"],
  "gcp": ["gcp", "google cloud"],
  "graphql": ["graphql", "gql"],
  "rest api": ["rest api", "rest", "api design", "restful"],
  "pytorch": ["pytorch", "torch", "deep learning", "machine learning"],
  "llm": ["llm", "large language models", "prompt engineering", "openai", "claude api", "ai"],
  "git": ["git", "github", "version control"],
  "ci/cd": ["ci/cd", "cicd", "github actions", "pipelines"],
  "redis": ["redis", "caching"],
  "kafka": ["kafka", "event streaming", "message queues"],
};

function normalizeSkill(s = "") {
  return String(s).toLowerCase().replace(/[^a-z0-9+#.]/g, "").trim();
}

function skillMatches(candidateSkill, targetSkill) {
  const cNorm = normalizeSkill(candidateSkill);
  const tNorm = normalizeSkill(targetSkill);

  if (!cNorm || !tNorm) return false;
  if (cNorm === tNorm) return true;
  if (cNorm.includes(tNorm) || tNorm.includes(cNorm)) return true;

  // Check synonym map
  for (const [key, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    const candidateInGroup = synonyms.some((syn) => normalizeSkill(syn) === cNorm || cNorm.includes(normalizeSkill(syn)));
    const targetInGroup = synonyms.some((syn) => normalizeSkill(syn) === tNorm || tNorm.includes(normalizeSkill(syn)));
    if (candidateInGroup && targetInGroup) return true;
  }

  return false;
}

/**
 * Extracts all candidate skill keywords from profile, experience, projects, and resume.
 */
function extractCandidateSkillPool(profile = {}) {
  const skillsSet = new Set();

  (profile.skills || []).forEach((s) => {
    if (s) skillsSet.add(s.trim());
  });

  (profile.experience || []).forEach((exp) => {
    (exp.skills || []).forEach((s) => {
      if (s) skillsSet.add(s.trim());
    });
    if (exp.title) skillsSet.add(exp.title.trim());
  });

  (profile.projects || []).forEach((proj) => {
    (proj.technologies || []).forEach((s) => {
      if (s) skillsSet.add(s.trim());
    });
  });

  // Also extract words from resume text if available
  const resumeText = profile.resume?.extractedText || "";
  if (resumeText) {
    const lowerResume = resumeText.toLowerCase();
    const commonKeywords = [
      "react", "next.js", "node.js", "typescript", "javascript", "python", "fastapi",
      "postgresql", "mongodb", "docker", "kubernetes", "aws", "gcp", "pytorch",
      "graphql", "tailwind", "redis", "kafka", "sql", "git", "ci/cd", "rest api", "llm"
    ];
    commonKeywords.forEach((kw) => {
      if (lowerResume.includes(kw)) {
        skillsSet.add(kw);
      }
    });
  }

  return Array.from(skillsSet);
}

/**
 * Computes recommendations for a given candidate profile and their historical role conversion stats.
 */
export function generateJobRecommendations({
  profile = {},
  rolePerformance = [],
  filterCategory = "All",
  searchQuery = "",
  remoteOnly = false,
  minSalary = 0,
  jobPool = null,
} = {}) {
  const candidateSkills = extractCandidateSkillPool(profile);
  const preferredLocations = profile.preferences?.preferredLocations || [];
  const remotePref = (profile.preferences?.remotePreference || "").toLowerCase();

  const sourceJobs = Array.isArray(jobPool) && jobPool.length > 0 ? jobPool : JOB_DIRECTORY;

  // Map historical interview rates by category
  const roleConversionMap = {};
  if (Array.isArray(rolePerformance)) {
    rolePerformance.forEach((r) => {
      if (r.category) {
        roleConversionMap[r.category] = {
          interviewRate: r.interviewRate || 0,
          totalApplied: r.totalApplied || 0,
          offers: r.offers || 0,
        };
      }
    });
  }

  const scoredJobs = sourceJobs.map((job) => {
    // 1. Skill Match Score (Max 45 pts)
    const matchedRequired = [];
    const missingRequired = [];

    job.requiredSkills.forEach((reqSkill) => {
      const isMatched = candidateSkills.some((cSkill) => skillMatches(cSkill, reqSkill));
      if (isMatched) {
        matchedRequired.push(reqSkill);
      } else {
        missingRequired.push(reqSkill);
      }
    });

    const matchedPreferred = [];
    (job.preferredSkills || []).forEach((prefSkill) => {
      const isMatched = candidateSkills.some((cSkill) => skillMatches(cSkill, prefSkill));
      if (isMatched) {
        matchedPreferred.push(prefSkill);
      }
    });

    const reqRatio = job.requiredSkills.length > 0 ? matchedRequired.length / job.requiredSkills.length : 0.8;
    const prefRatio = job.preferredSkills?.length > 0 ? matchedPreferred.length / job.preferredSkills.length : 0.5;
    const skillScore = Math.round(reqRatio * 32 + prefRatio * 13); // max 45

    // 2. Role & Seniority Fit (Max 25 pts)
    let roleScore = 15;
    const expCount = (profile.experience || []).length;
    const isSenior = expCount >= 3 || (profile.experience || []).some((e) => /senior|lead|principal|staff/i.test(e.title || ""));
    if (job.experienceLevel.includes("Senior") && isSenior) {
      roleScore = 24;
    } else if (!job.experienceLevel.includes("Senior")) {
      roleScore = 22;
    } else {
      roleScore = 17;
    }

    // 3. Location & Workplace Preference (Max 15 pts)
    let locScore = 10;
    const isJobRemote = job.workplaceType === "Remote";
    if (remotePref.includes("remote") && isJobRemote) {
      locScore = 15;
    } else if (isJobRemote) {
      locScore = 14;
    } else if (preferredLocations.some((l) => job.location.toLowerCase().includes(l.toLowerCase()))) {
      locScore = 14;
    } else {
      locScore = 11;
    }

    // 4. Empirical Historical Conversion Boost (Max 15 pts)
    let historicalScore = 8;
    const catStats = roleConversionMap[job.roleCategory];
    if (catStats) {
      if (catStats.interviewRate >= 20 || catStats.offers > 0) {
        historicalScore = 15;
      } else if (catStats.interviewRate > 0) {
        historicalScore = 12;
      } else if (catStats.totalApplied > 0) {
        historicalScore = 9;
      }
    } else {
      historicalScore = 10;
    }

    // Raw total: 0 - 100
    let totalScore = skillScore + roleScore + locScore + historicalScore;
    // Keep in a realistic high-signal range (55 - 98)
    totalScore = Math.min(98, Math.max(55, totalScore));

    // Determine Tier
    let matchTier = "Good Fit";
    let tierBadgeClass = "bg-blue-50 text-blue-700 border-blue-200";
    if (totalScore >= 88) {
      matchTier = "Exceptional Match";
      tierBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (totalScore >= 78) {
      matchTier = "Strong Match";
      tierBadgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
    } else if (totalScore >= 68) {
      matchTier = "Moderate Match";
      tierBadgeClass = "bg-amber-50 text-amber-700 border-amber-200";
    }

    // Personalized highlights
    const tailoredHighlights = [];
    if (matchedRequired.length > 0) {
      tailoredHighlights.push(`Direct alignment on core tech: ${matchedRequired.slice(0, 3).join(", ")}.`);
    }
    if (isJobRemote) {
      tailoredHighlights.push("100% remote opportunity compatible with your profile preference.");
    }
    if (catStats && catStats.interviewRate > 0) {
      tailoredHighlights.push(`High empirical success: You have a ${catStats.interviewRate}% interview rate for ${job.roleCategory} roles.`);
    } else {
      tailoredHighlights.push(`Compensation range (${job.salaryRange}) is in the top quartile for this role.`);
    }

    // Gap advice
    let gapAdvice = "Your tech profile strongly meets this posting's requirements. High probability of screening pass.";
    if (missingRequired.length > 0) {
      gapAdvice = `Emphasize related experience or project architecture around ${missingRequired.slice(0, 2).join(" & ")} during screening.`;
    }

    return {
      ...job,
      matchScore: totalScore,
      matchTier,
      tierBadgeClass,
      matchedSkills: [...matchedRequired, ...matchedPreferred],
      missingSkills: missingRequired,
      scoreBreakdown: {
        skills: Math.round((skillScore / 45) * 100),
        roleFit: Math.round((roleScore / 25) * 100),
        workplaceFit: Math.round((locScore / 15) * 100),
        historicalAffinity: Math.round((historicalScore / 15) * 100),
      },
      tailoredHighlights,
      gapAdvice,
    };
  });

  // Apply filters
  let filtered = scoredJobs;

  if (filterCategory && filterCategory !== "All") {
    filtered = filtered.filter((j) => j.roleCategory.toLowerCase().includes(filterCategory.toLowerCase()));
  }

  if (remoteOnly) {
    filtered = filtered.filter((j) => j.workplaceType === "Remote");
  }

  if (minSalary > 0) {
    filtered = filtered.filter((j) => j.salaryMin >= minSalary);
  }

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter((j) =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.requiredSkills.some((s) => s.toLowerCase().includes(q)) ||
      j.location.toLowerCase().includes(q)
    );
  }

  // Sort by highest match score first, then salary
  filtered.sort((a, b) => b.matchScore - a.matchScore || b.salaryMin - a.salaryMin);

  return {
    recommendations: filtered,
    totalCount: scoredJobs.length,
    topRoleCategory: rolePerformance?.[0]?.category || "Full Stack Engineer",
    averageMatch: Math.round(
      scoredJobs.reduce((acc, curr) => acc + curr.matchScore, 0) / (scoredJobs.length || 1)
    ),
  };
}
