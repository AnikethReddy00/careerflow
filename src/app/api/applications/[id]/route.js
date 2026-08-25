import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Application from "@/models/Application";
import StatusHistory from "@/models/StatusHistory";
import { getDevUser } from "@/lib/devUser";
import {
  APPLICATION_STATUS_VALUES,
  SOURCE_PLATFORM_VALUES,
  TERMINAL_STATUSES,
  ACTOR,
} from "@/lib/enums";

export const dynamic = "force-dynamic";

// GET /api/applications/:id — one application plus its status-change timeline
// (newest first). Powers the detail page.
export async function GET(request, { params }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return Response.json({ error: "Application not found" }, { status: 404 });
  }
  try {
    await connectDB();
    const user = await getDevUser();
    const application = await Application.findOne({
      _id: id,
      userId: user._id,
    }).lean();
    if (!application) {
      return Response.json({ error: "Application not found" }, { status: 404 });
    }
    const history = await StatusHistory.find({
      applicationId: id,
      userId: user._id,
    })
      .sort({ changedAt: -1 })
      .lean();
    return Response.json({ application, history });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/applications/:id — manual status change (for now).
// This is deliberately the same write path the agent will use later: update the
// application, flip isOpen for terminal statuses, and append a StatusHistory row
// recording WHO made the change. The only difference for the agent will be
// changedBy: "agent" instead of "user".
export async function PATCH(request, { params }) {
  const { id } = await params; // params is async in Next 16

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status, reason } = body || {};
  if (!status || !APPLICATION_STATUS_VALUES.includes(status)) {
    return Response.json(
      { error: "A valid status is required" },
      { status: 400 }
    );
  }
  if (!mongoose.isValidObjectId(id)) {
    return Response.json({ error: "Application not found" }, { status: 404 });
  }

  try {
    await connectDB();
    const user = await getDevUser();

    // Scope by userId so one user can never touch another's application.
    const application = await Application.findOne({
      _id: id,
      userId: user._id,
    });
    if (!application) {
      return Response.json({ error: "Application not found" }, { status: 404 });
    }

    const previousStatus = application.currentStatus;

    // No-op if unchanged — don't write a phantom history entry.
    if (previousStatus === status) {
      return Response.json({ application });
    }

    const now = new Date();
    application.currentStatus = status;
    // Terminal statuses (offer/rejected/withdrawn) take the application out of
    // the monitoring queue; moving back to a live status re-opens it.
    application.isOpen = !TERMINAL_STATUSES.includes(status);
    application.lastStatusChangeAt = now;
    await application.save();

    await StatusHistory.create({
      applicationId: application._id,
      userId: user._id,
      previousStatus,
      newStatus: status,
      changedBy: ACTOR.USER,
      reason: reason?.trim() || undefined,
      changedAt: now,
    });

    return Response.json({ application });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

// PUT /api/applications/:id — edit the descriptive fields. Status is
// deliberately NOT editable here: it only changes via PATCH, so every status
// change is guaranteed to leave a StatusHistory trail.
export async function PUT(request, { params }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return Response.json({ error: "Application not found" }, { status: 404 });
  }

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
    const user = await getDevUser();
    const application = await Application.findOne({
      _id: id,
      userId: user._id,
    });
    if (!application) {
      return Response.json({ error: "Application not found" }, { status: 404 });
    }

    application.companyName = companyName.trim();
    application.roleTitle = roleTitle.trim();
    application.sourcePlatform = sourcePlatform;
    // Empty string reliably clears an optional field that was previously set.
    application.resumeVersion = resumeVersion?.trim() || "";
    application.jobUrl = jobUrl?.trim() || "";
    application.notes = notes?.trim() || "";
    if (applicationDate) {
      application.applicationDate = new Date(applicationDate);
    }
    await application.save();

    return Response.json({ application });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

// DELETE /api/applications/:id — remove the application and cascade-delete its
// status history so no orphaned rows are left behind. (Email/outreach/agent
// logs will join this cleanup once those features exist.)
export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return Response.json({ error: "Application not found" }, { status: 404 });
  }

  try {
    await connectDB();
    const user = await getDevUser();
    const application = await Application.findOneAndDelete({
      _id: id,
      userId: user._id,
    });
    if (!application) {
      return Response.json({ error: "Application not found" }, { status: 404 });
    }
    await StatusHistory.deleteMany({ applicationId: id, userId: user._id });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
