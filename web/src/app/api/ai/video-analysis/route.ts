import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { analyzeTranscriptWithGeminiFlash } from "@/lib/ai/analyze-transcript";
import {
  countWords,
  transcriptDensityFallbackPercent,
  transcriptDensityPercent,
} from "@/lib/ai/transcript-density-score";
import { getFalKey } from "@/lib/ai/fal-openai";
import { transcribeYoutubeVideoWithGemini } from "@/lib/ai/transcribe-youtube-video";
import { visualSummarizeYoutubeVideo } from "@/lib/ai/visual-summarize-youtube-video";
import { createClient } from "@/lib/supabase/server";
import { parseYoutubeVideoId } from "@/lib/youtube/video-id";
import { parseDurationLabelToSeconds } from "@/lib/youtube/iso-duration";
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
  /** Seconds; preferred for speech-density vs video length when captions are missing. */
  durationSec: z.number().positive().max(86400).optional(),
  /** e.g. "13:01" — parsed server-side if durationSec omitted. */
  durationLabel: z.string().max(32).optional(),
});

const MAX_MODEL_INPUT = 100_000;

function getVisualDensityThreshold(): number {
  const raw = process.env.VIDSUM_VISUAL_DENSITY_THRESHOLD?.trim();
  const n = raw ? parseInt(raw, 10) : 40;
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return 40;
  }
  return n;
}

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
 * Body: { videoId, videoTitle?, durationSec?, durationLabel? }
 * Prefers YouTube captions; if missing, AI speech transcript + optional visual analysis when density < threshold or transcript fails.
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

    const resolvedDurationSec =
      parsed.data.durationSec ??
      (parsed.data.durationLabel
        ? parseDurationLabelToSeconds(parsed.data.durationLabel)
        : null);
    const videoDurationSecForAnalysis =
      resolvedDurationSec != null &&
      resolvedDurationSec > 0 &&
      Number.isFinite(resolvedDurationSec)
        ? Math.round(resolvedDurationSec)
        : undefined;

    let items: Awaited<ReturnType<typeof fetchTranscript>> | null = null;
    try {
      items = await fetchTranscript(parsed.data.videoId);
    } catch (e) {
      if (!shouldTryAiTranscription(e)) {
        const { status, message } = mapTranscriptError(e);
        console.error("[video-analysis] transcript", e);
        return NextResponse.json({ error: message }, { status });
      }
      console.warn(
        "[video-analysis] captions unavailable, trying AI transcription",
        e,
      );
      items = null;
    }

    let forModel: string;
    let visualContext: string | undefined;
    let transcriptDensityScore: number | null = null;
    let usedVisualFallback = false;

    if (items && items.length > 0) {
      const transcriptPlain = buildPlainTranscript(items);
      let timed = buildTimedTranscriptForModel(items);
      if (timed.length > MAX_MODEL_INPUT) {
        timed = transcriptPlain.slice(0, MAX_MODEL_INPUT);
      }
      forModel = timed;
    } else {
      const id = parseYoutubeVideoId(parsed.data.videoId);
      if (!id) {
        return NextResponse.json(
          {
            error:
              "Could not parse a valid YouTube video id for AI transcription.",
          },
          { status: 400 },
        );
      }

      const durationSec = resolvedDurationSec;

      let aiPlain: string | null = null;
      try {
        aiPlain = await transcribeYoutubeVideoWithGemini(id);
      } catch (e) {
        console.warn("[video-analysis] ai-transcribe failed", e);
      }

      const words = aiPlain ? countWords(aiPlain) : 0;
      let density: number;
      if (aiPlain === null) {
        density = 0;
      } else if (durationSec != null && durationSec > 0) {
        const p = transcriptDensityPercent(words, durationSec);
        density = p ?? transcriptDensityFallbackPercent(words);
      } else {
        density = transcriptDensityFallbackPercent(words);
      }
      transcriptDensityScore = density;

      const threshold = getVisualDensityThreshold();
      const needVisual = aiPlain === null || density < threshold;

      if (needVisual) {
        try {
          visualContext = await visualSummarizeYoutubeVideo(id);
          usedVisualFallback = true;
        } catch (e) {
          if (aiPlain === null) {
            const message =
              e instanceof Error
                ? e.message
                : "Speech and visual analysis both failed.";
            console.error("[video-analysis] visual-only path failed", e);
            return NextResponse.json({ error: message }, { status: 502 });
          }
          console.warn(
            "[video-analysis] visual fallback failed; using transcript only",
            e,
          );
        }
      }

      forModel = aiPlain?.length
        ? aiPlain.length > MAX_MODEL_INPUT
          ? aiPlain.slice(0, MAX_MODEL_INPUT)
          : aiPlain
        : "No speech transcript was available for this video.";
    }

    const analysis = await analyzeTranscriptWithGeminiFlash({
      transcript: forModel,
      videoTitle: parsed.data.videoTitle,
      videoDurationSec: videoDurationSecForAnalysis,
      visualContext,
    });

    return NextResponse.json({
      contentKind: analysis.content_kind,
      hasSpoilers: analysis.has_spoilers,
      summaryDetailed: analysis.summary_detailed,
      summaryShort: analysis.summary_short,
      revelations: analysis.revelations,
      keyPoints: analysis.key_points,
      segments: analysis.segments,
      hypeMoments: analysis.hype_moments,
      transcriptDensityScore,
      usedVisualFallback,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    console.error("[video-analysis]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
