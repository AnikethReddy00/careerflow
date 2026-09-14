import { connectDB } from "@/lib/mongodb";
import Application from "@/models/Application";
import { getCurrentUser } from "@/lib/session";
import { SOURCE_PLATFORM, APPLICATION_STATUS } from "@/lib/enums";
import { buildCandidateSnapshot, getOrCreateCandidateProfile } from "@/lib/candidateProfile";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { companyName, roleTitle, jobUrl, salaryRange, notes } = body || {};

    if (!companyName?.trim() || !roleTitle?.trim()) {
      return Response.json({ error: "Company name and role title are required" }, { status: 400 });
    }

    // Check if already tracked
    const existing = await Application.findOne({
      userId: user._id,
      companyName: new RegExp(`^${companyName.trim()}$`, "i"),
      roleTitle: new RegExp(`^${roleTitle.trim()}$`, "i"),
    });

    if (existing) {
      return Response.json({
        success: true,
        alreadyTracked: true,
        applicationId: existing._id,
        message: "Already tracked in your application pipeline",
      });
    }

    const profileDoc = await getOrCreateCandidateProfile(user);
    const candidateSnapshot = buildCandidateSnapshot(profileDoc.toObject());

    const appNotes = notes || (salaryRange ? `Recommended via JobSync Engine. Target comp: ${salaryRange}` : "Recommended via JobSync Engine.");

    const application = await Application.create({
      userId: user._id,
      companyName: companyName.trim(),
      roleTitle: roleTitle.trim(),
      sourcePlatform: SOURCE_PLATFORM.OTHER,
      currentStatus: APPLICATION_STATUS.APPLIED,
      jobUrl: jobUrl?.trim() || undefined,
      notes: appNotes,
      applicationDate: new Date(),
      candidateSnapshot,
    });

    return Response.json({
      success: true,
      alreadyTracked: false,
      applicationId: application._id,
      application,
      message: `Added ${companyName} (${roleTitle}) to your pipeline!`,
    }, { status: 201 });
  } catch (err) {
    console.error("Job track error:", err);
    return Response.json({ error: err.message || "Failed to track job" }, { status: 500 });
  }
}
