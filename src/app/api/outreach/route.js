import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import OutreachLog from "@/models/OutreachLog";
import Application from "@/models/Application";

export const dynamic = "force-dynamic";

// GET /api/outreach — list all outreach drafts for the signed-in user.
export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const filter = { userId: user._id };
  if (status) {
    filter.status = status;
  }

  const logs = await OutreachLog.find(filter)
    .populate({
      path: "applicationId",
      model: Application,
      select: "companyName roleTitle currentStatus applicationDate jobUrl",
    })
    .sort({ createdAt: -1 })
    .lean();

  return Response.json({ drafts: logs });
}
