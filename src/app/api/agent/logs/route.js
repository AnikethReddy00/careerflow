// GET /api/agent/logs — the agent's decision history, newest first. Powers the
// Activity Log page. Each row is joined to its application so the UI can show
// "Drafted follow-up · Software Engineer @ Acme" without a second request.

import { connectDB } from "@/lib/mongodb";
import AgentActionLog from "@/models/AgentActionLog";
import { getCurrentUser } from "@/lib/session";
// Imported for its side effect only: registers the Application model so the
// .populate() below can resolve it (the route never references it directly).
import "@/models/Application";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    const logs = await AgentActionLog.find({ userId: user._id })
      .sort({ cycleAt: -1 })
      .limit(100)
      .populate("applicationId", "companyName roleTitle")
      .lean();
    return Response.json({ logs });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
