import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import {
  calculateProfileCompleteness,
  getOrCreateCandidateProfile,
  sanitizeCandidateProfileInput,
} from "@/lib/candidateProfile";
import { buildCandidateContext } from "@/lib/candidateContextBuilder";

export const dynamic = "force-dynamic";

function buildPayload(user, profileDoc) {
  const profile = profileDoc.toObject ? profileDoc.toObject() : profileDoc;
  return {
    profile,
    completeness: calculateProfileCompleteness(profile),
    candidateContext: buildCandidateContext({ user, profile }),
  };
}

export async function GET() {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const profile = await getOrCreateCandidateProfile(user);
    return Response.json(buildPayload(user, profile));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const profile = await getOrCreateCandidateProfile(user);
    const next = sanitizeCandidateProfileInput(body?.profile || body, user);

    Object.assign(profile, next);
    await profile.save();

    return Response.json(buildPayload(user, profile));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
