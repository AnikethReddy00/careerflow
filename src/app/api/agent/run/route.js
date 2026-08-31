// POST /api/agent/run — manually trigger one agent cycle ("Run agent now").
// force:true means it re-evaluates every open application (not just those due),
// so the button always yields fresh, visible reasoning. A scheduled cron will
// later call runAgentCycle() without force to respect each app's nextCheckAt.

import { getCurrentUser } from "@/lib/session";
import { runAgentCycle } from "@/lib/agent/runCycle";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    const summary = await runAgentCycle({ user, force: true });
    return Response.json({ summary });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
