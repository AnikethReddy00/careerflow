import CandidateProfile from "@/models/CandidateProfile";

function cleanString(value, { lower = false } = {}) {
  const next = String(value ?? "").trim();
  if (!next) return "";
  return lower ? next.toLowerCase() : next;
}

function cleanArray(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => cleanString(value)).filter(Boolean);
}

function cleanDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sanitizeResume(input = {}) {
  const existingUploadedAt = cleanDate(input.uploadedAt);
  return {
    fileName: cleanString(input.fileName),
    fileType: cleanString(input.fileType),
    fileUrl: cleanString(input.fileUrl),
    extractedText: cleanString(input.extractedText),
    uploadedAt: existingUploadedAt,
    updatedAt:
      cleanString(input.fileName) ||
      cleanString(input.fileType) ||
      cleanString(input.fileUrl) ||
      cleanString(input.extractedText)
        ? new Date()
        : null,
  };
}

export function buildEmptyCandidateProfile(user = {}) {
  const [firstName = "", ...rest] = cleanString(user.name).split(/\s+/).filter(Boolean);
  return {
    personal: {
      firstName,
      lastName: rest.join(" "),
      email: cleanString(user.email, { lower: true }),
      phone: "",
      location: "",
    },
    education: [],
    experience: [],
    projects: [],
    skills: [],
    certifications: [],
    links: {
      linkedin: "",
      github: "",
      portfolio: "",
      other: [],
    },
    workAuthorization: {
      status: "",
      sponsorshipRequired: null,
    },
    preferences: {
      jobTypes: [],
      preferredLocations: [],
      remotePreference: "",
      industries: [],
    },
    resume: {
      fileName: "",
      fileType: "",
      fileUrl: "",
      extractedText: "",
      uploadedAt: null,
      updatedAt: null,
    },
  };
}

export function sanitizeCandidateProfileInput(input = {}, user = {}) {
  const defaults = buildEmptyCandidateProfile(user);
  const personal = input.personal || {};
  const links = input.links || {};
  const workAuthorization = input.workAuthorization || {};
  const preferences = input.preferences || {};

  return {
    personal: {
      firstName: cleanString(personal.firstName || defaults.personal.firstName),
      lastName: cleanString(personal.lastName || defaults.personal.lastName),
      email: cleanString(personal.email || defaults.personal.email, { lower: true }),
      phone: cleanString(personal.phone),
      location: cleanString(personal.location),
    },
    education: Array.isArray(input.education)
      ? input.education.map((item) => ({
          institution: cleanString(item?.institution),
          degree: cleanString(item?.degree),
          field: cleanString(item?.field),
          startDate: cleanDate(item?.startDate),
          endDate: cleanDate(item?.endDate),
          description: cleanString(item?.description),
        }))
      : [],
    experience: Array.isArray(input.experience)
      ? input.experience.map((item) => ({
          company: cleanString(item?.company),
          title: cleanString(item?.title),
          startDate: cleanDate(item?.startDate),
          endDate: cleanDate(item?.endDate),
          description: cleanString(item?.description),
          skills: cleanArray(item?.skills),
        }))
      : [],
    projects: Array.isArray(input.projects)
      ? input.projects.map((item) => ({
          name: cleanString(item?.name),
          description: cleanString(item?.description),
          technologies: cleanArray(item?.technologies),
          url: cleanString(item?.url),
        }))
      : [],
    skills: cleanArray(input.skills),
    certifications: Array.isArray(input.certifications)
      ? input.certifications.map((item) => ({
          name: cleanString(item?.name),
          issuer: cleanString(item?.issuer),
          issueDate: cleanDate(item?.issueDate),
          expirationDate: cleanDate(item?.expirationDate),
          url: cleanString(item?.url),
        }))
      : [],
    links: {
      linkedin: cleanString(links.linkedin),
      github: cleanString(links.github),
      portfolio: cleanString(links.portfolio),
      other: cleanArray(links.other),
    },
    workAuthorization: {
      status: cleanString(workAuthorization.status),
      sponsorshipRequired:
        typeof workAuthorization.sponsorshipRequired === "boolean"
          ? workAuthorization.sponsorshipRequired
          : null,
    },
    preferences: {
      jobTypes: cleanArray(preferences.jobTypes),
      preferredLocations: cleanArray(preferences.preferredLocations),
      remotePreference: cleanString(preferences.remotePreference),
      industries: cleanArray(preferences.industries),
    },
    resume: sanitizeResume(input.resume),
  };
}

export async function getOrCreateCandidateProfile(user) {
  let profile = await CandidateProfile.findOne({ userId: user._id });
  if (!profile) {
    profile = await CandidateProfile.create({
      userId: user._id,
      ...buildEmptyCandidateProfile(user),
    });
  }
  return profile;
}

function countIf(value) {
  return value ? 1 : 0;
}

export function calculateProfileCompleteness(profile = {}) {
  const checks = [
    countIf(profile.personal?.firstName),
    countIf(profile.personal?.lastName),
    countIf(profile.personal?.email),
    countIf(profile.personal?.location),
    countIf((profile.skills || []).length),
    countIf((profile.experience || []).length),
    countIf((profile.education || []).length),
    countIf((profile.projects || []).length),
    countIf(profile.links?.linkedin || profile.links?.github || profile.links?.portfolio),
    countIf(profile.resume?.fileName || profile.resume?.extractedText),
    countIf(profile.workAuthorization?.status),
    countIf(
      (profile.preferences?.jobTypes || []).length ||
        (profile.preferences?.preferredLocations || []).length ||
        profile.preferences?.remotePreference
    ),
  ];
  const completed = checks.reduce((sum, value) => sum + value, 0);
  const total = checks.length || 1;
  const percent = Math.round((completed / total) * 100);

  return {
    completed,
    total,
    percent,
  };
}

export function buildCandidateSnapshot(profile = {}) {
  const personal = profile.personal || {};
  const links = profile.links || {};
  const resume = profile.resume || {};
  const workAuthorization = profile.workAuthorization || {};

  return {
    personal: {
      firstName: cleanString(personal.firstName),
      lastName: cleanString(personal.lastName),
      email: cleanString(personal.email, { lower: true }),
      phone: cleanString(personal.phone),
      location: cleanString(personal.location),
    },
    skills: cleanArray(profile.skills),
    links: {
      linkedin: cleanString(links.linkedin),
      github: cleanString(links.github),
      portfolio: cleanString(links.portfolio),
      other: cleanArray(links.other),
    },
    workAuthorization: {
      status: cleanString(workAuthorization.status),
      sponsorshipRequired:
        typeof workAuthorization.sponsorshipRequired === "boolean"
          ? workAuthorization.sponsorshipRequired
          : null,
    },
    preferences: {
      jobTypes: cleanArray(profile.preferences?.jobTypes),
      preferredLocations: cleanArray(profile.preferences?.preferredLocations),
      remotePreference: cleanString(profile.preferences?.remotePreference),
      industries: cleanArray(profile.preferences?.industries),
    },
    resume: {
      fileName: cleanString(resume.fileName),
      fileType: cleanString(resume.fileType),
      fileUrl: cleanString(resume.fileUrl),
      updatedAt: resume.updatedAt || null,
    },
    profileUpdatedAt: profile.updatedAt || null,
  };
}
