import { extractText } from "unpdf";

/**
 * Extracts clean text from a PDF Buffer, Uint8Array, ArrayBuffer, or base64 string.
 * Uses unpdf which operates in pure JS runtime without worker thread requirements.
 *
 * @param {Buffer | Uint8Array | ArrayBuffer | string} input
 * @returns {Promise<{ text: string, numPages: number }>}
 */
export async function extractTextFromPDF(input) {
  let uint8Array;

  if (typeof input === "string") {
    const base64Clean = input.includes("base64,") ? input.split("base64,")[1] : input;
    const buf = Buffer.from(base64Clean, "base64");
    uint8Array = new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  } else if (input instanceof ArrayBuffer) {
    uint8Array = new Uint8Array(input);
  } else if (Buffer.isBuffer(input)) {
    uint8Array = new Uint8Array(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength));
  } else if (input instanceof Uint8Array) {
    uint8Array = new Uint8Array(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength));
  } else {
    throw new Error("Invalid PDF input format");
  }

  try {
    const result = await extractText(uint8Array);

    let fullText = "";
    if (result && Array.isArray(result.text)) {
      fullText = result.text
        .map((pageStr) => (typeof pageStr === "string" ? pageStr.trim() : ""))
        .filter(Boolean)
        .join("\n\n");
    } else if (result && typeof result.text === "string") {
      fullText = result.text.trim();
    }

    const numPages = result?.totalPages || (Array.isArray(result?.text) ? result.text.length : 1);

    if (fullText && fullText.trim().length > 0) {
      return {
        text: fullText.trim(),
        numPages,
      };
    }
  } catch (err) {
    console.warn("unpdf extraction warning, trying raw stream fallback:", err.message);
  }

  // Fallback: extract text streams from PDF if standard extraction is empty
  const rawString = Buffer.from(uint8Array).toString("latin1");
  const textMatches = [];
  const streamRegex = /BT[\s\S]*?ET/g;
  let match;
  while ((match = streamRegex.exec(rawString)) !== null) {
    const block = match[0];
    const tjRegex = /\((.*?)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textMatches.push(tjMatch[1]);
    }
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let tjArrayMatch;
    while ((tjArrayMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = tjArrayMatch[1];
      const innerTj = /\((.*?)\)/g;
      let innerMatch;
      while ((innerMatch = innerTj.exec(inner)) !== null) {
        textMatches.push(innerMatch[1]);
      }
    }
  }

  const fallbackText = textMatches.join(" ").replace(/\\([()\\])/g, "$1").trim();
  if (fallbackText.length > 0) {
    return {
      text: fallbackText,
      numPages: 1,
    };
  }

  throw new Error("Could not extract readable text from this PDF. It may be scanned (image-only) or encrypted.");
}
