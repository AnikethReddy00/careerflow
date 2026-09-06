import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import OutreachLog from "@/models/OutreachLog";
import Application from "@/models/Application";
import { OUTREACH_STATUS, OUTREACH_STATUS_VALUES } from "@/lib/enums";

export const dynamic = "force-dynamic";

// PATCH /api/outreach/[id] — approve, edit, or reject a follow-up draft.
export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await connectDB();

  const draft = await OutreachLog.findOne({ _id: id, userId: user._id });
  if (!draft) {
    return Response.json({ error: "Draft not found" }, { status: 404 });
  }

  const { status, subject, draftText, finalText } = body;

  if (status && !OUTREACH_STATUS_VALUES.includes(status)) {
    return Response.json(
      { error: `Invalid status "${status}".` },
      { status: 400 }
    );
  }

  if (subject !== undefined) draft.subject = String(subject).trim();
  if (draftText !== undefined) draft.draftText = String(draftText).trim();
  if (finalText !== undefined) draft.finalText = String(finalText).trim();

  if (status) {
    draft.status = status;
    if (
      status === OUTREACH_STATUS.APPROVED_SENT ||
      status === OUTREACH_STATUS.EDITED_SENT ||
      status === OUTREACH_STATUS.AUTO_SENT
    ) {
      draft.sentAt = new Date();
      if (!draft.finalText) {
        draft.finalText = draft.draftText;
      }
      // Update application lastEmailAt
      await Application.updateOne(
        { _id: draft.applicationId, userId: user._id },
        { $set: { lastEmailAt: new Date() } }
      );
    }
  }

  await draft.save();

  const populated = await OutreachLog.findById(draft._id)
    .populate({
      path: "applicationId",
      model: Application,
      select: "companyName roleTitle currentStatus applicationDate jobUrl",
    })
    .lean();

  return Response.json({ draft: populated });
}

// DELETE /api/outreach/[id] — dismiss/remove a draft.
export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const result = await OutreachLog.deleteOne({ _id: id, userId: user._id });
  if (result.deletedCount === 0) {
    return Response.json({ error: "Draft not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
