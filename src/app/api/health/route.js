import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";

// Never cache a health check — always report the live connection state.
export const dynamic = "force-dynamic";

// GET /api/health — confirms the app can reach MongoDB. This is the Stage 0
// "read one value from the database" check: hit it in the browser and you should
// see { ok: true, db: "connected" }.
export async function GET() {
  try {
    await connectDB();
    const state = mongoose.connection.readyState; // 1 = connected
    return Response.json({
      ok: state === 1,
      db: state === 1 ? "connected" : "not-connected",
      dbName: mongoose.connection.name || null,
      time: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      { ok: false, db: "error", error: err.message },
      { status: 500 }
    );
  }
}
