import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "./gemini-api-key";

/** Default matches Gemini API video + YouTube URL docs; override with GEMINI_TRANSCRIBE_MODEL. */
const DEFAULT_TRANSCRIBE_MODEL = "gemini-2.5-flash";

const TRANSCRIBE_PROMPT = `Transcribe ALL spoken words in this video from start to finish.

Rules:
- Output ONLY the spoken dialogue and narration, in the original language of the audio (do not translate).
- Verbatim when possible; omit filler-only sounds that are not words.
- Plain text with line breaks between sentences or short phrases.
- Do NOT summarize, do NOT add commentary, do NOT describe visuals unless the speaker says those words aloud.
- If there is no speech, or you cannot access the audio/video, output exactly: TRANSCRIPTION_UNAVAILABLE`;

/**
 * Transcribes speech using the Gemini API with a public YouTube watch URL (file_uri).
 * Used when YouTube caption tracks are missing or disabled.
 */
export async function transcribeYoutubeVideoWithGemini(
  videoId: string,
): Promise<string> {
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
