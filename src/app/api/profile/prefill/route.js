import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import CandidateProfile from "@/models/CandidateProfile";
import { DEFAULT_TEST_PROFILE } from "@/lib/testProfileData";
import {
  calculateProfileCompleteness,
  sanitizeCandidateProfileInput,
} from "@/lib/candidateProfile";
import { buildCandidateContext } from "@/lib/candidateContextBuilder";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = {
      ...DEFAULT_TEST_PROFILE,
      personal: {
        ...DEFAULT_TEST_PROFILE.personal,
        email: user.email || DEFAULT_TEST_PROFILE.personal.email,
        firstName: user.name ? user.name.split(" ")[0] : DEFAULT_TEST_PROFILE.personal.firstName,
        lastName: user.name && user.name.split(" ").length > 1 ? user.name.split(" ").slice(1).join(" ") : DEFAULT_TEST_PROFILE.personal.lastName,
      },
    };

    const sanitized = sanitizeCandidateProfileInput(payload, user);

    let profile = await CandidateProfile.findOne({ userId: user._id });
    if (!profile) {
      profile = new CandidateProfile({ userId: user._id, ...sanitized });
    } else {
      Object.assign(profile, sanitized);
    }
    await profile.save();

    const plainProfile = profile.toObject ? profile.toObject() : profile;
    return Response.json({
      success: true,
      message: "Candidate profile successfully prefilled with test data.",
      profile: plainProfile,
      completeness: calculateProfileCompleteness(plainProfile),
      candidateContext: buildCandidateContext({ user, profile: plainProfile }),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
