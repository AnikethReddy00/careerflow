import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { getFullAnalyticsSnapshot } from "@/lib/intelligence/analyticsEngine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const snapshot = await getFullAnalyticsSnapshot(user._id.toString());
    return Response.json(
      { snapshot },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    console.error("Intelligence Snapshot Error:", err);
    return Response.json({ error: err.message || "Failed to load snapshot" }, { status: 500 });
  }
}
