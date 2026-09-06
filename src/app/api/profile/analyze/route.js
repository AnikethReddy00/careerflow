import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import CandidateProfile from "@/models/CandidateProfile";
import { analyzeResumeGap } from "@/lib/llm/resumeGapAnalysis";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let { resumeText = "", jdText = "", question = "" } = body;

  jdText = String(jdText).trim();
  if (jdText.length < 20) {
    return Response.json(
      { error: "Please provide a job description (at least 20 characters)." },
      { status: 400 }
    );
  }

  // If resume text is not supplied, build it from user's saved profile in MongoDB
  if (!resumeText.trim()) {
    await connectDB();
    const profile = await CandidateProfile.findOne({ userId: user._id }).lean();
    if (profile) {
      const parts = [];
      if (profile.personal?.firstName) {
        parts.push(`Name: ${profile.personal.firstName} ${profile.personal.lastName || ""}`);
      }
      if (profile.skills?.length) {
        parts.push(`Skills: ${profile.skills.join(", ")}`);
      }
      if (profile.experience?.length) {
        parts.push("Experience:\n" + profile.experience.map(e => `- ${e.title} at ${e.company}: ${e.highlights?.join(". ")}`).join("\n"));
      }
      if (profile.projects?.length) {
        parts.push("Projects:\n" + profile.projects.map(p => `- ${p.name}: ${p.description} (Tech: ${p.technologies?.join(", ")})`).join("\n"));
      }
      if (profile.education?.length) {
        parts.push("Education:\n" + profile.education.map(ed => `- ${ed.degree} from ${ed.institution}`).join("\n"));
      }
      resumeText = parts.join("\n\n");
    }
  }

  if (resumeText.trim().length < 20) {
    return Response.json(
      { error: "Please provide your resume text or save your profile background first." },
      { status: 400 }
    );
  }

  try {
    const analysis = await analyzeResumeGap({
      resumeText,
      jdText,
      question,
    });
    return Response.json({ analysis });
  } catch (err) {
    console.error("Resume gap analysis error:", err);
    return Response.json(
      { error: err.message || "Failed to analyze resume gap with local AI." },
      { status: 500 }
    );
  }
}
