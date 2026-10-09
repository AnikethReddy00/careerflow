import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import CandidateProfile from "@/models/CandidateProfile";
import { analyzeResumeGap } from "@/lib/llm/resumeGapAnalysis";
import { extractTextFromPDF } from "@/lib/pdfParser";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let resumeText = "";
  let jdText = "";
  let question = "";

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      question = String(formData.get("question") || "");
      resumeText = String(formData.get("resumeText") || "");
      jdText = String(formData.get("jdText") || "");

      const resumeFile = formData.get("resumeFile");
      if (resumeFile && typeof resumeFile !== "string" && resumeFile.size > 0) {
        const arr = await resumeFile.arrayBuffer();
        const extracted = await extractTextFromPDF(arr);
        resumeText = extracted.text;
      }

      const jdFile = formData.get("jdFile");
      if (jdFile && typeof jdFile !== "string" && jdFile.size > 0) {
        const arr = await jdFile.arrayBuffer();
        const extracted = await extractTextFromPDF(arr);
        jdText = extracted.text;
      }
    } catch (err) {
      return Response.json(
        { error: "Failed to process multipart upload: " + err.message },
        { status: 400 }
      );
    }
  } else {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    resumeText = body.resumeText || "";
    jdText = body.jdText || "";
    question = body.question || "";

    if (body.resumePdfBase64) {
      try {
        const extracted = await extractTextFromPDF(body.resumePdfBase64);
        resumeText = extracted.text;
      } catch (e) {
        return Response.json({ error: "Failed to extract text from Resume PDF: " + e.message }, { status: 400 });
      }
    }

    if (body.jdPdfBase64) {
      try {
        const extracted = await extractTextFromPDF(body.jdPdfBase64);
        jdText = extracted.text;
      } catch (e) {
        return Response.json({ error: "Failed to extract text from JD PDF: " + e.message }, { status: 400 });
      }
    }
  }

  jdText = String(jdText).trim();
  if (jdText.length < 20) {
    return Response.json(
      { error: "Please provide a job description (at least 20 characters) or upload a JD PDF." },
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
        parts.push(
          "Experience:\n" +
            profile.experience
              .map((e) => `- ${e.title} at ${e.company}: ${e.highlights?.join(". ") || e.description || ""}`)
              .join("\n")
        );
      }
      if (profile.projects?.length) {
        parts.push(
          "Projects:\n" +
            profile.projects
              .map((p) => `- ${p.name}: ${p.description || ""} (Tech: ${p.technologies?.join(", ") || ""})`)
              .join("\n")
        );
      }
      if (profile.education?.length) {
        parts.push(
          "Education:\n" +
            profile.education.map((ed) => `- ${ed.degree} from ${ed.institution}`).join("\n")
        );
      }
      resumeText = parts.join("\n\n");
    }
  }

  if (resumeText.trim().length < 20) {
    return Response.json(
      { error: "Please provide your resume (paste text or upload a PDF) or save your profile background first." },
      { status: 400 }
    );
  }

  try {
    const analysis = await analyzeResumeGap({
      resumeText,
      jdText,
      question,
    });
    return Response.json({
      analysis,
      meta: {
        resumeCharCount: resumeText.length,
        jdCharCount: jdText.length,
      },
    });
  } catch (err) {
    console.error("Resume gap analysis error:", err);
    return Response.json(
      { error: err.message || "Failed to analyze resume gap with AI." },
      { status: 500 }
    );
  }
}
