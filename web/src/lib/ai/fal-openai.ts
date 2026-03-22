import OpenAI from "openai";

/** Server-only fal API key from env (trimmed). */
export function getFalKey(): string | undefined {
  const k = process.env.FAL_KEY?.trim();
  return k ? k : undefined;
}

/**
 * OpenAI-compatible client routed through fal → OpenRouter (Gemini, etc.).
 * Requires `FAL_KEY` in server environment only.
 */
export function getFalOpenAI(): OpenAI {
  const key = getFalKey();
  if (!key) {
    throw new Error("FAL_KEY is not set");
  }

  return new OpenAI({
    apiKey: "not-needed",
    baseURL: "https://fal.run/openrouter/router/openai/v1",
    defaultHeaders: {
      Authorization: `Key ${key}`,
    },
  });
}
