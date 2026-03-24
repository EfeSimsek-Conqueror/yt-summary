import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { analyzeTranscriptWithGeminiFlash } from "@/lib/ai/analyze-transcript";
import { getFalKey } from "@/lib/ai/fal-openai";
import { getGeminiApiKey } from "@/lib/ai/gemini-api-key";
import { transcribeYoutubeVideoWithGemini } from "@/lib/ai/transcribe-youtube-video";
import { createClient } from "@/lib/supabase/server";
import { parseYoutubeVideoId } from "@/lib/youtube/video-id";
import {
  buildPlainTranscript,
  buildTimedTranscriptForModel,
} from "@/lib/youtube/transcript-for-analysis";
import {
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
  fetchTranscript,
} from "youtube-transcript";

const bodySchema = z.object({
  videoId: z.string().min(1).max(500),
  videoTitle: z.string().max(500).optional(),
});

const MAX_MODEL_INPUT = 100_000;

function mapTranscriptError(e: unknown): { status: number; message: string } {
  if (e instanceof YoutubeTranscriptTooManyRequestError) {
    return { status: 429, message: "YouTube rate limit; try again later." };
  }
  if (e instanceof YoutubeTranscriptVideoUnavailableError) {
    return { status: 404, message: "Video is unavailable." };
  }
  if (e instanceof YoutubeTranscriptDisabledError) {
    return { status: 422, message: "Captions are disabled for this video." };
  }
  if (e instanceof YoutubeTranscriptNotAvailableLanguageError) {
    return {
      status: 422,
      message: e.message,
    };
  }
  if (e instanceof YoutubeTranscriptNotAvailableError) {
    return { status: 422, message: "No captions available for this video." };
  }
  return {
    status: 502,
    message: e instanceof Error ? e.message : "Transcript fetch failed",
  };
}

function shouldTryAiTranscription(e: unknown): boolean {
  return (
    e instanceof YoutubeTranscriptDisabledError ||
    e instanceof YoutubeTranscriptNotAvailableError ||
    e instanceof YoutubeTranscriptNotAvailableLanguageError
  );
}

/**
 * POST /api/ai/video-analysis
 * Body: { videoId: string (11-char id or watch URL), videoTitle?: string }
 * Prefers YouTube captions; if missing, transcribes via Gemini (video URL) then analyzes.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!getFalKey()) {
      return NextResponse.json(
        { error: "FAL_KEY is not configured on the server" },
        { status: 503 },
      );
    }

    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    let items: Awaited<ReturnType<typeof fetchTranscript>> | null = null;
    try {
      items = await fetchTranscript(parsed.data.videoId);
    } catch (e) {
      if (!shouldTryAiTranscription(e)) {
        const { status, message } = mapTranscriptError(e);
        console.error("[video-analysis] transcript", e);
        return NextResponse.json({ error: message }, { status });
      }
      console.warn("[video-analysis] captions unavailable, trying AI transcription", e);
      items = null;
    }

    let forModel: string;
    if (items && items.length > 0) {
      const transcriptPlain = buildPlainTranscript(items);
      let timed = buildTimedTranscriptForModel(items);
      if (timed.length > MAX_MODEL_INPUT) {
        timed = transcriptPlain.slice(0, MAX_MODEL_INPUT);
      }
      forModel = timed;
    } else {
      if (!getGeminiApiKey()) {
        return NextResponse.json(
          {
            error:
              "GEMINI_API_KEY is not configured on the server (required when YouTube captions are unavailable).",
          },
          { status: 503 },
        );
      }
      const id = parseYoutubeVideoId(parsed.data.videoId);
      if (!id) {
        return NextResponse.json(
          { error: "Could not parse a valid YouTube video id for AI transcription." },
          { status: 400 },
        );
      }
      try {
        const plain = await transcribeYoutubeVideoWithGemini(id);
        forModel =
          plain.length > MAX_MODEL_INPUT ? plain.slice(0, MAX_MODEL_INPUT) : plain;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "AI transcription failed.";
        console.error("[video-analysis] ai-transcribe", e);
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }

    const analysis = await analyzeTranscriptWithGeminiFlash({
      transcript: forModel,
      videoTitle: parsed.data.videoTitle,
    });

    return NextResponse.json({
      contentKind: analysis.content_kind,
      hasSpoilers: analysis.has_spoilers,
      summaryDetailed: analysis.summary_detailed,
      summaryShort: analysis.summary_short,
      revelations: analysis.revelations,
      keyPoints: analysis.key_points,
      segments: analysis.segments,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    console.error("[video-analysis]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
