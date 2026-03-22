import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { analyzeTranscriptWithGeminiFlash } from "@/lib/ai/analyze-transcript";
import { getFalKey } from "@/lib/ai/fal-openai";
import { createClient } from "@/lib/supabase/server";
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

/**
 * POST /api/ai/video-analysis
 * Body: { videoId: string (11-char id or watch URL), videoTitle?: string }
 * Fetches captions, then runs Gemini analysis via fal.
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

    let items;
    try {
      items = await fetchTranscript(parsed.data.videoId);
    } catch (e) {
      const { status, message } = mapTranscriptError(e);
      console.error("[video-analysis] transcript", e);
      return NextResponse.json({ error: message }, { status });
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Transcript is empty." },
        { status: 422 },
      );
    }

    const transcriptPlain = buildPlainTranscript(items);
    let forModel = buildTimedTranscriptForModel(items);
    if (forModel.length > MAX_MODEL_INPUT) {
      forModel = transcriptPlain.slice(0, MAX_MODEL_INPUT);
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
