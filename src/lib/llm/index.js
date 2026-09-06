// Thin, provider-agnostic LLM transport. Feature modules call
// generateJSON({system, user, schema}) and get back parsed JSON matching the
// schema they pass in. Provider details stay isolated here.

const PROVIDER = process.env.LLM_PROVIDER || "groq";

// Groq — free, fast, hosted (OpenAI-compatible API). The default.
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

// Ollama — fully local & private alternative. Used when LLM_PROVIDER=ollama.
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";

// OpenRouter — hosted OpenAI-compatible alternative. Used when
// LLM_PROVIDER=openrouter.
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "liquid/lfm-2.5-2.6b:free";

// A local model can be slow on the first call (it loads into memory). Give it room.
const REQUEST_TIMEOUT_MS = 90000;

// Distinct error type so routes can tell "the user's local model isn't reachable"
// (their setup, a 502) apart from ordinary bad input (a 4xx).
export class LLMError extends Error {
  constructor(message, { cause } = {}) {
    super(message);
    this.name = "LLMError";
    if (cause) this.cause = cause;
  }
}

// Human-readable description of what we're talking to — handy in error messages.
export function llmTarget() {
  if (PROVIDER === "groq") return `${GROQ_MODEL} on Groq`;
  if (PROVIDER === "openrouter") return `${OPENROUTER_MODEL} on OpenRouter`;
  return `${OLLAMA_MODEL} on ${OLLAMA_BASE_URL}`;
}

// Clean output from models: strips Qwen 3 reasoning tokens (<think>...</think>),
// markdown code fences, and extra trailing/leading prose.
function cleanAndParseJSON(raw) {
  if (typeof raw === "object" && raw !== null) return raw;
  let text = String(raw || "").trim();
  // Strip reasoning blocks from Qwen 3 / DeepSeek models
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Strip markdown code fences ```json ... ```
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(text);
}

async function ollamaGenerateJSON({ system, user, schema }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // In Qwen 3, injecting a schema hint directly into the prompt ensures high fidelity JSON
  const schemaHint = schema
    ? `\n\nReturn a valid JSON object matching this schema:\n${JSON.stringify(schema)}`
    : "";
  const sys =
    `${system || ""}\nRespond with a single valid JSON object only.${schemaHint}`.trim();

  let res;
  try {
    res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: "json",
        options: { temperature: 0 },
        messages: [
          ...(sys ? [{ role: "system", content: sys }] : []),
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new LLMError(
        `The local model (${OLLAMA_MODEL}) took too long to respond. Try a smaller model or a shorter paste.`
      );
    }
    throw new LLMError(
      `Couldn't reach the local model at ${OLLAMA_BASE_URL}. Is Ollama running? Start it with "ollama serve" and make sure you've pulled "${OLLAMA_MODEL}".`,
      { cause: err }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new LLMError(
      `Local model request failed (${res.status}). ${detail.slice(0, 300)}`
    );
  }

  const data = await res.json();
  const content = data?.message?.content;
  if (!content) {
    throw new LLMError("The local model returned an empty response.");
  }

  try {
    return cleanAndParseJSON(content);
  } catch (err) {
    throw new LLMError(
      `The local model's response wasn't valid JSON.`,
      { cause: err }
    );
  }
}

async function groqGenerateJSON({ system, user, schema }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new LLMError(
      "GROQ_API_KEY is not set — add it to .env.local. Get a free key (no card) at https://console.groq.com/keys."
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Groq's JSON mode needs the word "JSON" in the prompt and behaves best when the
  // exact shape is spelled out. We inject that here so feature code stays provider-
  // agnostic (it just hands us a schema, same as it does for Ollama).
  const schemaHint = schema
    ? `\n\nReturn a single JSON object matching this schema:\n${JSON.stringify(schema)}`
    : "";
  const sys =
    `${system || ""}\nRespond with a single valid JSON object and nothing else.${schemaHint}`.trim();

  let res;
  try {
    res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new LLMError("Groq took too long to respond. Try again.");
    }
    throw new LLMError(
      `Couldn't reach Groq at ${GROQ_BASE_URL}. Check your internet connection.`,
      { cause: err }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new LLMError("Groq rejected the API key (401). Check GROQ_API_KEY in .env.local.");
    }
    if (res.status === 404) {
      throw new LLMError(
        `Groq doesn't recognize the model "${GROQ_MODEL}" (404). Set GROQ_MODEL to a current model from https://console.groq.com/docs/models.`
      );
    }
    throw new LLMError(`Groq request failed (${res.status}). ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new LLMError("Groq returned an empty response.");
  }

  try {
    return cleanAndParseJSON(content);
  } catch (err) {
    throw new LLMError("Groq's response wasn't valid JSON.", { cause: err });
  }
}

async function openRouterGenerateJSON({ system, user, schema }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new LLMError(
      "OPENROUTER_API_KEY is not set — add it to .env.local and set LLM_PROVIDER=openrouter."
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const schemaHint = schema
    ? `\n\nReturn a single JSON object matching this schema:\n${JSON.stringify(schema)}`
    : "";
  const sys =
    `${system || ""}\nRespond with a single valid JSON object and nothing else.${schemaHint}`.trim();

  let res;
  try {
    res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "CareerFlow AI",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new LLMError("OpenRouter took too long to respond. Try again.");
    }
    throw new LLMError(
      `Couldn't reach OpenRouter at ${OPENROUTER_BASE_URL}. Check your internet connection.`,
      { cause: err }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new LLMError(
        "OpenRouter rejected the API key (401). Check OPENROUTER_API_KEY in .env.local."
      );
    }
    if (res.status === 404) {
      throw new LLMError(
        `OpenRouter doesn't recognize the model "${OPENROUTER_MODEL}" (404). Set OPENROUTER_MODEL to a valid model id.`
      );
    }
    throw new LLMError(
      `OpenRouter request failed (${res.status}). ${detail.slice(0, 300)}`
    );
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new LLMError("OpenRouter returned an empty response.");
  }

  try {
    return cleanAndParseJSON(content);
  } catch (err) {
    throw new LLMError("OpenRouter's response wasn't valid JSON.", {
      cause: err,
    });
  }
}

// Ask the configured provider to return JSON matching `schema`.
export async function generateJSON({ system, user, schema }) {
  if (PROVIDER === "groq") {
    return groqGenerateJSON({ system, user, schema });
  }
  if (PROVIDER === "openrouter") {
    return openRouterGenerateJSON({ system, user, schema });
  }
  if (PROVIDER === "ollama") {
    return ollamaGenerateJSON({ system, user, schema });
  }
  throw new LLMError(
    `Unsupported LLM_PROVIDER "${PROVIDER}". Use "groq", "openrouter", or "ollama".`
  );
}
