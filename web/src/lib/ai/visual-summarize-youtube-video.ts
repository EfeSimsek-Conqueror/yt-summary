import { createFalClient } from "@fal-ai/client";
import { GoogleGenAI } from "@google/genai";
import { getFalKey } from "./fal-openai";
import { getGeminiApiKey } from "./gemini-api-key";

const DEFAULT_VISUAL_MODEL = "gemini-2.5-flash";
const FAL_GEMINI_VIDEO = "google/gemini-2.5-flash";

const VISUAL_PROMPT = `You are describing this video for someone summarizing it in an app. The spoken transcript may be missing or thin—your job is what happens ON SCREEN.

Cover:
- Setting, location, lighting, era if obvious (film/TV/game).
- People: who appears, clothing, recognizable actors/characters if inferable, body language.
- Action: fights, stunts, chases, violence (factually), comedy beats, dance, sports moves, gameplay (what the player does, HUD, objectives if visible).
- Important props, vehicles, weapons (non-graphic description), text on screen, signage.
- Scene flow: what changes from beginning to end; major beats without copying dialogue verbatim.

Rules:
- Prioritize non-verbal storytelling and visual information over repeating dialogue.
- For films, trailers, clips, gameplays, and movie scenes: be concrete about actions and identities when visible.
- Plain prose; optional short section headings. About 350–900 words for a typical few-minute clip; shorter if the video is very short.
- Do not add moral judgment; describe only what is shown.
- If you cannot access the video or see almost nothing useful, output exactly: VISUAL_UNAVAILABLE`;

async function visualSummarizeWithGeminiApi(videoId: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const model =
    process.env.GEMINI_VISUAL_MODEL?.trim() || DEFAULT_VISUAL_MODEL;
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
      { text: VISUAL_PROMPT },
    ],
    config: {
      temperature: 0.25,
      maxOutputTokens: 24_576,
    },
  });

  const text = response.text?.trim() ?? "";
  if (!text) {
    throw new Error("Visual analysis returned empty output.");
  }
  if (text.includes("VISUAL_UNAVAILABLE")) {
    throw new Error(
      "Visual analysis could not access this video (blocked or model limitation).",
    );
  }

  return text;
}

async function visualSummarizeWithFalVideoRouter(
  videoId: string,
): Promise<string> {
  const key = getFalKey();
  if (!key) {
    throw new Error("FAL_KEY is not set");
  }

  const client = createFalClient({ credentials: key });
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

  const result = await client.subscribe("openrouter/router/video", {
    input: {
      video_urls: [watchUrl],
      prompt: VISUAL_PROMPT,
      model: FAL_GEMINI_VIDEO,
      temperature: 0.25,
      max_tokens: 24_576,
    },
  });

  const data = result.data as { output?: unknown };
  const text = typeof data?.output === "string" ? data.output.trim() : "";

  if (!text) {
    throw new Error("Visual analysis returned empty output.");
  }
  if (text.includes("VISUAL_UNAVAILABLE")) {
    throw new Error(
      "Visual analysis could not access this video (blocked or model limitation).",
    );
  }

  return text;
}

/**
 * When captions are missing and speech transcript is thin: describes on-screen action
 * (films, games, scenes). Same routing as speech transcription (Gemini API vs FAL).
 */
export async function visualSummarizeYoutubeVideo(
  videoId: string,
): Promise<string> {
  if (getGeminiApiKey()) {
    return visualSummarizeWithGeminiApi(videoId);
  }
  return visualSummarizeWithFalVideoRouter(videoId);
}
