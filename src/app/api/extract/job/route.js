import { getCurrentUser } from "@/lib/session";
import { extractJobPosting } from "@/lib/llm/jobExtraction";
import { LLMError } from "@/lib/llm";

export const dynamic = "force-dynamic";

// Guard rail: don't shovel an enormous paste into the model's context.
const MAX_CHARS = 20000;
const MIN_CHARS = 40;

// POST /api/extract/job — { text } -> { fields } for the add-application form.
// Auth-guarded so this can't be used as an open proxy to the local model.
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

  const text = String(body?.text || "").trim();
  if (text.length < MIN_CHARS) {
    return Response.json(
      { error: "Paste a bit more of the job posting so the model has something to read." },
      { status: 400 }
    );
  }

  try {
    const fields = await extractJobPosting(text.slice(0, MAX_CHARS));
    return Response.json({ fields });
  } catch (err) {
    // A missing/slow local model is the user's setup (502); anything else here
    // is the model failing to produce usable fields (422).
    const status = err instanceof LLMError ? 502 : 422;
    return Response.json({ error: err.message }, { status });
  }
}
