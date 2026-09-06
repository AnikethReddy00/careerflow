import CandidateProfile from "@/models/CandidateProfile";
import {
  buildCandidateSnapshot,
  buildEmptyCandidateProfile,
  calculateProfileCompleteness,
} from "@/lib/candidateProfile";

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function extractKeywords(text) {
  return unique(
    String(text || "")
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/i)
      .map((part) => part.trim())
      .filter((part) => part.length >= 3)
  );
}

function selectRelevantSkills(profile, job = {}) {
  const profileSkills = Array.isArray(profile.skills) ? profile.skills : [];
  const haystack = extractKeywords(
    `${job.roleTitle || ""} ${job.companyName || ""} ${job.notes || ""}`
  );
  const matched = profileSkills.filter((skill) => {
    const parts = extractKeywords(skill);
    return parts.some((part) => haystack.includes(part));
  });
  return matched.length ? matched : profileSkills.slice(0, 12);
}

export function buildCandidateContext({ user, profile, job } = {}) {
  const source = profile || buildEmptyCandidateProfile(user);
  const snapshot = buildCandidateSnapshot(source);
  return {
    personal: snapshot.personal,
    skills: snapshot.skills,
    relevantSkills: selectRelevantSkills(source, job),
    links: snapshot.links,
    workAuthorization: snapshot.workAuthorization,
    preferences: snapshot.preferences,
    resume: {
      fileName: snapshot.resume.fileName,
      fileType: snapshot.resume.fileType,
      extractedText: String(source.resume?.extractedText || "").trim(),
      updatedAt: snapshot.resume.updatedAt,
    },
    completeness: calculateProfileCompleteness(source),
  };
}

export async function buildCandidateContextForUser({ user, job } = {}) {
  const profile = await CandidateProfile.findOne({ userId: user._id }).lean();
  return buildCandidateContext({ user, profile, job });
}
