import { getCurrentUser } from "@/lib/session";
import { extractTextFromPDF } from "@/lib/pdfParser";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    let buffer;
    let fileName = "document.pdf";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") || formData.get("pdf");
      if (!file || typeof file === "string") {
        return Response.json({ error: "No PDF file provided in upload" }, { status: 400 });
      }

      fileName = file.name || "document.pdf";
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      const json = await request.json();
      if (!json.pdfBase64 && !json.fileData) {
        return Response.json({ error: "Missing PDF data in request" }, { status: 400 });
      }
      fileName = json.fileName || "document.pdf";
      const base64Str = json.pdfBase64 || json.fileData;
      const clean = base64Str.includes("base64,") ? base64Str.split("base64,")[1] : base64Str;
      buffer = Buffer.from(clean, "base64");
    }

    if (!buffer || buffer.length === 0) {
      return Response.json({ error: "Uploaded file is empty" }, { status: 400 });
    }

    // Check PDF magic bytes (%PDF)
    const header = buffer.subarray(0, 5).toString("utf8");
    if (!header.startsWith("%PDF")) {
      return Response.json(
        { error: "Invalid file format. Please upload a valid PDF document." },
        { status: 400 }
      );
    }

    const { text, numPages } = await extractTextFromPDF(buffer);

    if (!text || text.trim().length === 0) {
      return Response.json(
        {
          error:
            "Could not extract readable text from this PDF. It might be scanned/image-only or password protected.",
        },
        { status: 422 }
      );
    }

    return Response.json({
      success: true,
      fileName,
      text: text.trim(),
      numPages,
      charCount: text.trim().length,
    });
  } catch (err) {
    console.error("PDF Extraction error:", err);
    return Response.json(
      { error: err.message || "Failed to parse and extract text from PDF" },
      { status: 500 }
    );
  }
}
