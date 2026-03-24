import { createFalClient } from "@fal-ai/client";
import { GoogleGenAI } from "@google/genai";
import { getFalKey } from "./fal-openai";
import { getGeminiApiKey } from "./gemini-api-key";

/** Default matches Gemini API video + YouTube URL docs; override with GEMINI_TRANSCRIBE_MODEL. */
const DEFAULT_TRANSCRIBE_MODEL = "gemini-2.5-flash";

const FAL_GEMINI_VIDEO = "google/gemini-2.5-flash";

const TRANSCRIBE_PROMPT = `Transcribe ALL spoken words in this video from start to finish.

Rules:
- Output ONLY the spoken dialogue and narration, in the original language of the audio (do not translate).
- Verbatim when possible; omit filler-only sounds that are not words.
- Plain text with line breaks between sentences or short phrases.
- Do NOT summarize, do NOT add commentary, do NOT describe visuals unless the speaker says those words aloud.
- If there is no speech, or you cannot access the audio/video, output exactly: TRANSCRIPTION_UNAVAILABLE`;

async function transcribeWithGeminiApi(videoId: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const model =
    process.env.GEMINI_TRANSCRIBE_MODEL?.trim() || DEFAULT_TRANSCRIBE_MODEL;
  const ai = new GoogleGenAI({ apiKey });
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        fileData: {
          fileUri: watchUrl,
          mimeType: "video/*",
        },
      },
      { text: TRANSCRIBE_PROMPT },
    ],
    config: {
      temperature: 0.1,
      maxOutputTokens: 32_768,
    },
  });

  const text = response.text?.trim() ?? "";
  if (!text) {
    throw new Error("AI transcription returned empty output.");
  }
  if (text.includes("TRANSCRIPTION_UNAVAILABLE")) {
    throw new Error(
      "AI could not access speech for this video (blocked, no speech, or model limitation).",
    );
  }

  return text;
}

async function transcribeWithFalVideoRouter(videoId: string): Promise<string> {
  const key = getFalKey();
  if (!key) {
    throw new Error("FAL_KEY is not set");
  }

  const client = createFalClient({ credentials: key });
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

  const result = await client.subscribe("openrouter/router/video", {
    input: {
      video_urls: [watchUrl],
      prompt: TRANSCRIBE_PROMPT,
      model: FAL_GEMINI_VIDEO,
      temperature: 0.1,
      max_tokens: 32_768,
    },
  });

  const data = result.data as { output?: unknown };
  const text =
    typeof data?.output === "string" ? data.output.trim() : "";

  if (!text) {
    throw new Error("AI transcription returned empty output.");
  }
  if (text.includes("TRANSCRIPTION_UNAVAILABLE")) {
    throw new Error(
      "AI could not access speech for this video (blocked, no speech, or model limitation).",
    );
  }

  return text;
}

/**
 * When YouTube captions are missing: prefers direct Gemini API if `GEMINI_API_KEY` is set,
 * otherwise uses fal `openrouter/router/video` (requires `FAL_KEY`, same as analysis).
 */
export async function transcribeYoutubeVideoWithGemini(
  videoId: string,
): Promise<string> {
  if (getGeminiApiKey()) {
    return transcribeWithGeminiApi(videoId);
  }
  return transcribeWithFalVideoRouter(videoId);
}
