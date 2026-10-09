import { PDFParse } from "pdf-parse";

/**
 * Extracts clean text from a PDF Buffer, Uint8Array, ArrayBuffer, or base64 string.
 * @param {Buffer | Uint8Array | ArrayBuffer | string} input
 * @returns {Promise<{ text: string, numPages: number }>}
 */
export async function extractTextFromPDF(input) {
  let data;
  if (typeof input === "string") {
    // Strip data URL prefixes if present
    const base64Clean = input.includes("base64,") ? input.split("base64,")[1] : input;
    data = Buffer.from(base64Clean, "base64");
  } else if (input instanceof ArrayBuffer) {
    data = Buffer.from(input);
  } else if (input instanceof Uint8Array || Buffer.isBuffer(input)) {
    data = input;
  } else {
    throw new Error("Invalid PDF input format");
  }

  const parser = new PDFParse({ data });
  try {
    await parser.load();
    const result = await parser.getText();

    let fullText = "";
    if (result && Array.isArray(result.pages) && result.pages.length > 0) {
      fullText = result.pages
        .map((p) => (p.text || "").trim())
        .filter(Boolean)
        .join("\n\n");
    } else if (result && typeof result.text === "string") {
      fullText = result.text.replace(/-- \d+ of \d+ --/g, "").trim();
    }

    const numPages = result?.total || result?.pages?.length || 1;
    return {
      text: fullText.trim(),
      numPages,
    };
  } finally {
    try {
      await parser.destroy();
    } catch {
      // ignore cleanup errors
    }
  }
}
