import { connectDB } from "@/lib/mongodb";
import Application from "@/models/Application";
import { getCurrentUser } from "@/lib/session";
import { SOURCE_PLATFORM_VALUES } from "@/lib/enums";

// Reads/writes per request — never statically cached.
export const dynamic = "force-dynamic";

// GET /api/applications — list the current (dev) user's applications, newest first.
export async function GET() {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    const applications = await Application.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();
    return Response.json({ applications });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/applications — create one application for the current (dev) user.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    companyName,
    roleTitle,
    sourcePlatform,
    resumeVersion,
    jobUrl,
    notes,
    applicationDate,
  } = body || {};

  // Required fields — mirror the model so the user gets a clear 400 instead of
  // a raw Mongoose validation error.
  if (!companyName?.trim() || !roleTitle?.trim() || !sourcePlatform) {
    return Response.json(
      { error: "companyName, roleTitle and sourcePlatform are required" },
      { status: 400 }
    );
  }
  if (!SOURCE_PLATFORM_VALUES.includes(sourcePlatform)) {
    return Response.json({ error: "Invalid sourcePlatform" }, { status: 400 });
  }

  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    const application = await Application.create({
      userId: user._id,
      companyName: companyName.trim(),
      roleTitle: roleTitle.trim(),
      sourcePlatform,
      resumeVersion: resumeVersion?.trim() || undefined,
      jobUrl: jobUrl?.trim() || undefined,
      notes: notes?.trim() || undefined,
      // Model defaults applicationDate to now if we pass undefined.
      applicationDate: applicationDate ? new Date(applicationDate) : undefined,
    });
    return Response.json({ application }, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
