import mongoose from "mongoose";
import Application from "@/models/Application";
import StatusHistory from "@/models/StatusHistory";
import { APPLICATION_STATUS } from "@/lib/enums";

function roundPercent(numerator, denominator) {
  if (!denominator || denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function normalizeRole(roleTitle = "") {
  const r = roleTitle.toLowerCase();
  if (/machine learning|ml|ai|artificial intelligence|data scien|nlp|computer vision/i.test(r)) {
    return "AI / ML Engineer";
  }
  if (/full[\s_-]?stack|fullstack/i.test(r)) {
    return "Full Stack Engineer";
  }
  if (/front[\s_-]?end|frontend|react|ui|web developer/i.test(r)) {
    return "Frontend Engineer";
  }
  if (/back[\s_-]?end|backend|node|python|java|api/i.test(r)) {
    return "Backend Engineer";
  }
  if (/devops|cloud|infrastructure|sre|platform/i.test(r)) {
    return "DevOps / Cloud Engineer";
  }
  return "Software Engineer";
}

/**
 * Computes deterministic application funnel metrics directly from MongoDB.
 */
export async function computeFunnelMetrics(userId) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const apps = await Application.find({ userId: userObjId }).lean();

  const totalApplications = apps.length;
  const activeApplications = apps.filter((a) => a.isOpen).length;

  // Stages count (either currently at or reached via status history)
  const assessmentCount = apps.filter(
    (a) => a.currentStatus === APPLICATION_STATUS.ASSESSMENT || a.currentStatus === APPLICATION_STATUS.INTERVIEW || a.currentStatus === APPLICATION_STATUS.OFFERED
  ).length;

  const interviewCount = apps.filter(
    (a) => a.currentStatus === APPLICATION_STATUS.INTERVIEW || a.currentStatus === APPLICATION_STATUS.OFFERED
  ).length;

  const offerCount = apps.filter(
    (a) => a.currentStatus === APPLICATION_STATUS.OFFERED
  ).length;

  const rejectedCount = apps.filter(
    (a) => a.currentStatus === APPLICATION_STATUS.REJECTED
  ).length;

  const appliedCount = totalApplications;

  // Conversion rates
  const appToAssessmentRate = roundPercent(assessmentCount, appliedCount);
  const assessmentToInterviewRate = roundPercent(interviewCount, assessmentCount || appliedCount);
  const interviewToOfferRate = roundPercent(offerCount, interviewCount || 1);
  const overallOfferRate = roundPercent(offerCount, appliedCount);
  const rejectionRate = roundPercent(rejectedCount, appliedCount);

  // Determine biggest drop-off
  let biggestBottleneck = "Application → Assessment (OA)";
  let minConversion = appToAssessmentRate;

  if (assessmentCount > 0 && assessmentToInterviewRate < minConversion) {
    biggestBottleneck = "Assessment → Interview";
    minConversion = assessmentToInterviewRate;
  }
  if (interviewCount > 0 && interviewToOfferRate < minConversion) {
    biggestBottleneck = "Interview → Final Offer";
    minConversion = interviewToOfferRate;
  }

  return {
    totalApplications,
    activeApplications,
    appliedCount,
    assessmentCount,
    interviewCount,
    offerCount,
    rejectedCount,
    rates: {
      appToAssessmentRate,
      assessmentToInterviewRate,
      interviewToOfferRate,
      overallOfferRate,
      rejectionRate,
    },
    biggestBottleneck,
  };
}

/**
 * Computes performance breakdown by job role category.
 */
export async function computeRolePerformance(userId) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const apps = await Application.find({ userId: userObjId }).lean();

  const roleMap = {};

  for (const app of apps) {
    const roleCat = normalizeRole(app.roleTitle);
    if (!roleMap[roleCat]) {
      roleMap[roleCat] = {
        category: roleCat,
        totalApplied: 0,
        interviews: 0,
        offers: 0,
        rejected: 0,
        active: 0,
      };
    }
    roleMap[roleCat].totalApplied += 1;
    if (app.isOpen) roleMap[roleCat].active += 1;
    if (app.currentStatus === APPLICATION_STATUS.INTERVIEW || app.currentStatus === APPLICATION_STATUS.OFFERED) {
      roleMap[roleCat].interviews += 1;
    }
    if (app.currentStatus === APPLICATION_STATUS.OFFERED) {
      roleMap[roleCat].offers += 1;
    }
    if (app.currentStatus === APPLICATION_STATUS.REJECTED) {
      roleMap[roleCat].rejected += 1;
    }
  }

  const roleList = Object.values(roleMap).map((r) => ({
    ...r,
    interviewRate: roundPercent(r.interviews, r.totalApplied),
    offerRate: roundPercent(r.offers, r.totalApplied),
    rejectionRate: roundPercent(r.rejected, r.totalApplied),
  }));

  roleList.sort((a, b) => b.interviewRate - a.interviewRate || b.totalApplied - a.totalApplied);
  return roleList;
}

/**
 * Computes performance breakdown by application source/platform.
 */
export async function computeSourcePerformance(userId) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const apps = await Application.find({ userId: userObjId }).lean();

  const sourceMap = {};

  for (const app of apps) {
    const source = app.sourcePlatform || "other";
    if (!sourceMap[source]) {
      sourceMap[source] = {
        platform: source,
        totalApplied: 0,
        interviews: 0,
        offers: 0,
        rejected: 0,
      };
    }
    sourceMap[source].totalApplied += 1;
    if (app.currentStatus === APPLICATION_STATUS.INTERVIEW || app.currentStatus === APPLICATION_STATUS.OFFERED) {
      sourceMap[source].interviews += 1;
    }
    if (app.currentStatus === APPLICATION_STATUS.OFFERED) {
      sourceMap[source].offers += 1;
    }
    if (app.currentStatus === APPLICATION_STATUS.REJECTED) {
      sourceMap[source].rejected += 1;
    }
  }

  const sourceList = Object.values(sourceMap).map((s) => ({
    ...s,
    interviewRate: roundPercent(s.interviews, s.totalApplied),
    offerRate: roundPercent(s.offers, s.totalApplied),
    rejectionRate: roundPercent(s.rejected, s.totalApplied),
  }));

  sourceList.sort((a, b) => b.interviewRate - a.interviewRate || b.totalApplied - a.totalApplied);
  return sourceList;
}

/**
 * Computes rejection statistics and stage breakdown.
 */
export async function computeRejectionAnalytics(userId) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const rejectedApps = await Application.find({
    userId: userObjId,
    currentStatus: APPLICATION_STATUS.REJECTED,
  }).lean();

  const totalRejections = rejectedApps.length;
  const history = await StatusHistory.find({
    userId: userObjId,
    newStatus: APPLICATION_STATUS.REJECTED,
  }).lean();

  let rejectedAtInitial = 0;
  let rejectedAfterAssessment = 0;
  let rejectedAfterInterview = 0;

  for (const h of history) {
    if (h.previousStatus === APPLICATION_STATUS.INTERVIEW) {
      rejectedAfterInterview += 1;
    } else if (h.previousStatus === APPLICATION_STATUS.ASSESSMENT) {
      rejectedAfterAssessment += 1;
    } else {
      rejectedAtInitial += 1;
    }
  }

  // If no history exists, fall back to initial
  if (totalRejections > 0 && history.length === 0) {
    rejectedAtInitial = totalRejections;
  }

  return {
    totalRejections,
    stageBreakdown: {
      initialScreen: rejectedAtInitial,
      postAssessment: rejectedAfterAssessment,
      postInterview: rejectedAfterInterview,
    },
    companiesRejected: rejectedApps.map((a) => ({
      company: a.companyName,
      role: a.roleTitle,
      date: a.applicationDate,
    })),
  };
}

/**
 * Gets status changes in the last N days.
 */
export async function getRecentStatusChanges(userId, days = 7) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const changes = await StatusHistory.find({
    userId: userObjId,
    changedAt: { $gte: since },
  })
    .populate("applicationId", "companyName roleTitle currentStatus")
    .sort({ changedAt: -1 })
    .lean();

  return changes.map((c) => ({
    companyName: c.applicationId?.companyName || "Unknown Company",
    roleTitle: c.applicationId?.roleTitle || "Role",
    previousStatus: c.previousStatus || "applied",
    newStatus: c.newStatus,
    changedAt: c.changedAt,
    reason: c.reason,
    changedBy: c.changedBy,
  }));
}

/**
 * Gets stale applications waiting for response > threshold days.
 */
export async function getStaleApplications(userId, daysThreshold = 14) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const cutoff = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

  const stale = await Application.find({
    userId: userObjId,
    isOpen: true,
    $or: [
      { lastStatusChangeAt: { $lte: cutoff } },
      { lastStatusChangeAt: null, applicationDate: { $lte: cutoff } },
    ],
  })
    .sort({ applicationDate: 1 })
    .lean();

  return stale.map((a) => {
    const lastDate = a.lastStatusChangeAt || a.applicationDate;
    const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / (24 * 60 * 60 * 1000));
    return {
      id: a._id.toString(),
      companyName: a.companyName,
      roleTitle: a.roleTitle,
      currentStatus: a.currentStatus,
      daysSince,
      appliedDate: a.applicationDate,
    };
  });
}

/**
 * Performs natural language filter queries against the user's applications.
 */
export async function queryApplicationsWithFilters(userId, filters = {}) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const query = { userId: userObjId };

  if (filters.status && filters.status !== "all") {
    if (filters.status === "active") {
      query.isOpen = true;
    } else {
      query.currentStatus = filters.status;
    }
  }

  if (filters.companyName) {
    query.companyName = { $regex: filters.companyName, $options: "i" };
  }

  if (filters.roleKeyword) {
    query.roleTitle = { $regex: filters.roleKeyword, $options: "i" };
  }

  if (filters.sourcePlatform) {
    query.sourcePlatform = filters.sourcePlatform;
  }

  if (filters.daysAgo) {
    const since = new Date(Date.now() - Number(filters.daysAgo) * 24 * 60 * 60 * 1000);
    query.applicationDate = { $gte: since };
  }

  const apps = await Application.find(query)
    .sort({ applicationDate: -1 })
    .limit(25)
    .lean();

  return apps.map((a) => ({
    id: a._id.toString(),
    companyName: a.companyName,
    roleTitle: a.roleTitle,
    currentStatus: a.currentStatus,
    sourcePlatform: a.sourcePlatform,
    applicationDate: a.applicationDate,
    isOpen: a.isOpen,
    jobUrl: a.jobUrl,
  }));
}

/**
 * Gathers complete analytical snapshot for user intelligence prompts.
 */
export async function getFullAnalyticsSnapshot(userId) {
  const [
    funnel,
    roles,
    sources,
    rejections,
    recentChanges,
    staleApplications,
  ] = await Promise.all([
    computeFunnelMetrics(userId),
    computeRolePerformance(userId),
    computeSourcePerformance(userId),
    computeRejectionAnalytics(userId),
    getRecentStatusChanges(userId, 7),
    getStaleApplications(userId, 14),
  ]);

  const bestRole = roles[0] ? `${roles[0].category} (${roles[0].interviewRate}% interview rate)` : "None yet";
  const bestSource = sources[0] ? `${sources[0].platform} (${sources[0].interviewRate}% interview rate)` : "None yet";

  return {
    funnel,
    roles,
    sources,
    rejections,
    recentChanges,
    staleApplications,
    summary: {
      total: funnel.totalApplications,
      active: funnel.activeApplications,
      interviews: funnel.interviewCount,
      offers: funnel.offerCount,
      bestRole,
      bestSource,
      biggestBottleneck: funnel.biggestBottleneck,
      staleCount: staleApplications.length,
      weeklyChangesCount: recentChanges.length,
    },
  };
}
