// POST /api/agent/run — manually trigger one agent cycle ("Run agent now").
// force:true means it re-evaluates every open application (not just those due),
// so the button always yields fresh, visible reasoning. A scheduled cron will
// later call runAgentCycle() without force to respect each app's nextCheckAt.

import { runAgentCycle } from "@/lib/agent/runCycle";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const summary = await runAgentCycle({ force: true });
    return Response.json({ summary });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
