import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { getOrCreateCandidateProfile } from "@/lib/candidateProfile";
import { computeRolePerformance } from "@/lib/intelligence/analyticsEngine";
import { generateJobRecommendations } from "@/lib/jobs/recommendationEngine";
import { getLiveAndCuratedJobs } from "@/lib/jobs/liveJobFetcher";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterCategory = searchParams.get("category") || "All";
    const searchQuery = searchParams.get("search") || "";
    const remoteOnly = searchParams.get("remoteOnly") === "true";
    const minSalary = parseInt(searchParams.get("minSalary") || "0", 10);

    const profileDoc = await getOrCreateCandidateProfile(user);
    const profile = profileDoc.toObject();

    let rolePerformance = [];
    try {
      rolePerformance = await computeRolePerformance(user._id);
    } catch {
      // fallback
    }

    // Fetch live market jobs from Jobicy/public feeds + curated postings
    const liveAndCurated = await getLiveAndCuratedJobs();

    const result = generateJobRecommendations({
      profile,
      rolePerformance,
      filterCategory,
      searchQuery,
      remoteOnly,
      minSalary,
      jobPool: liveAndCurated,
    });

    return Response.json({
      success: true,
      ...result,
      userPreferences: profile.preferences || {},
    });
  } catch (err) {
    console.error("Job recommendations error:", err);
    return Response.json({ error: err.message || "Failed to generate recommendations" }, { status: 500 });
  }
}
