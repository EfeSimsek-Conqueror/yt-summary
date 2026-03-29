import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { analyzeTranscriptWithGeminiFlash } from "@/lib/ai/analyze-transcript";
import { getFalKey } from "@/lib/ai/fal-openai";
import { createClient } from "@/lib/supabase/server";
import { parseYoutubeVideoId } from "@/lib/youtube/video-id";
import { parseDurationLabelToSeconds } from "@/lib/youtube/iso-duration";
import {
  buildPlainTranscript,
  buildTimedTranscriptForModel,
} from "@/lib/youtube/transcript-for-analysis";
import { fetchTranscriptRobust } from "@/lib/youtube/fetch-transcript-robust";
import type { TranscriptResponse } from "youtube-transcript";
import {
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";

/** Transcript via Supadata + analysis LLM call. */
export const maxDuration = 900;

const MIN_TRANSCRIPT_PLAIN_CHARS = 400;

const bodySchema = z.object({
  videoId: z.string().min(1).max(500),
  videoTitle: z.string().max(500).optional(),
  durationSec: z.number().positive().max(86400).optional(),
  durationLabel: z.string().max(32).optional(),
  /** When captions cannot be fetched, paste at least 400 chars to analyze. */
  transcriptPlain: z.string().max(120_000).optional(),
});

const MAX_MODEL_INPUT = 100_000;

function mapTranscriptError(e: unknown): { status: number; message: string } {
  if (e instanceof YoutubeTranscriptTooManyRequestError) {
    return {
      status: 429,
      message:
        "Transcript request was rate-limited (Supadata quota). Wait and retry; successful transcripts are cached for a while.",
    };
  }
  if (e instanceof YoutubeTranscriptVideoUnavailableError) {
    return { status: 404, message: "Video is unavailable." };
  }
  if (e instanceof YoutubeTranscriptDisabledError) {
    return {
      status: 422,
      message:
        "YouTube did not expose captions to this server for this video (uploader disabled captions or regional limits). Try another video or again later.",
    };
  }
  if (e instanceof YoutubeTranscriptNotAvailableLanguageError) {
    return {
      status: 422,
      message:
        "Could not load captions automatically. Try again in a minute or use a different video.",
    };
  }
  if (e instanceof YoutubeTranscriptNotAvailableError) {
    return { status: 422, message: "No captions available for this video." };
  }
  const msg = e instanceof Error ? e.message : "";
  if (msg.includes("No transcripts are available in")) {
    return {
      status: 422,
      message:
        "Could not load captions automatically. Try again in a minute or use a different video.",
    };
  }
  if (msg.includes("Transcript is disabled")) {
    return {
      status: 422,
      message:
        "YouTube did not expose captions to this server for this video. Try another video or again later.",
    };
  }
  return {
    status: 502,
    message: e instanceof Error ? e.message : "Transcript fetch failed",
  };
}

/**
 * POST /api/ai/video-analysis
 * Flow: fetch transcript via Supadata → LLM analysis.
 * Optional `transcriptPlain` only when automatic fetch returns nothing.
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

    let items: TranscriptResponse[] | null = null;
    let transcriptFetchError: { status: number; message: string } | null =
      null;
    try {
      items = await fetchTranscriptRobust(parsed.data.videoId);
    } catch (e) {
      transcriptFetchError = mapTranscriptError(e);
      if (transcriptFetchError.status >= 500) {
        console.error("[video-analysis] transcript", e);
      } else {
        console.warn("[video-analysis] transcript", transcriptFetchError.message);
      }
    }

    const clientPlain = parsed.data.transcriptPlain?.trim();
    const canUsePastedTranscript =
      !!clientPlain && clientPlain.length >= MIN_TRANSCRIPT_PLAIN_CHARS;

    const haveCaptions = items !== null && items.length > 0;

    let forModel: string;

    if (haveCaptions) {
      const transcriptPlain = buildPlainTranscript(items!);
      let timed = buildTimedTranscriptForModel(items!);
      if (timed.length > MAX_MODEL_INPUT) {
        timed = transcriptPlain.slice(0, MAX_MODEL_INPUT);
      }
      forModel = timed;
    } else if (canUsePastedTranscript && clientPlain) {
      console.warn(
        "[video-analysis] using client transcriptPlain (no captions from YouTube)",
        parseYoutubeVideoId(parsed.data.videoId) ?? parsed.data.videoId,
      );
      forModel =
        clientPlain.length > MAX_MODEL_INPUT
          ? clientPlain.slice(0, MAX_MODEL_INPUT)
          : clientPlain;
    } else if (transcriptFetchError) {
      return NextResponse.json(
        { error: transcriptFetchError.message },
        { status: transcriptFetchError.status },
      );
    } else {
      return NextResponse.json(
        {
          error:
            "No transcript text. Captions were empty — try another video or again later.",
        },
        { status: 422 },
      );
    }

    const analysis = await analyzeTranscriptWithGeminiFlash({
      transcript: forModel,
      videoTitle: parsed.data.videoTitle,
      videoDurationSec: videoDurationSecForAnalysis,
    });

    return NextResponse.json({
      contentKind: analysis.content_kind,
      hasSpoilers: analysis.has_spoilers,
      summaryDetailed: analysis.summary_detailed,
      summaryShort: analysis.summary_short,
      revelations: analysis.revelations,
      keyPoints: analysis.key_points,
      keyMoments: analysis.key_moments,
      segments: analysis.segments,
      hypeMoments: analysis.hype_moments,
      transcriptDensityScore: null,
      usedVisualFallback: false,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    console.error("[video-analysis]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
