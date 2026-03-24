/** Server-only Gemini API key (Google AI Studio / Gemini API). */
export function getGeminiApiKey(): string | undefined {
  const k =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  return k ? k : undefined;
}
