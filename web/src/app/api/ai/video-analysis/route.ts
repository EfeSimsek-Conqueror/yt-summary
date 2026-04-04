import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { analyzeTranscriptWithGeminiFlash } from "@/lib/ai/analyze-transcript";
import { getFalKey } from "@/lib/ai/fal-openai";
import { createClient } from "@/lib/supabase/server";
import { parseYoutubeVideoId } from "@/lib/youtube/video-id";
import { parseDurationLabelToSeconds } from "@/lib/youtube/iso-duration";
import {
  checkCreditsForAnalysis,
  deductCreditsAfterAnalysis,
} from "@/lib/billing/analysis-credits-server";
import {
  buildPlainTranscript,
  buildTimedTranscriptForModel,
  estimateDurationSecondsFromTranscriptItems,
} from "@/lib/youtube/transcript-for-analysis";
import { readSupadataApiKey } from "@/lib/server/supadata-env";
import { fetchTranscriptRobust } from "@/lib/youtube/fetch-transcript-robust";
import type { TranscriptResponse } from "youtube-transcript";
import {
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";

/** Node runtime: full `process.env` (Supadata, FAL). Edge would omit server secrets. */
export const runtime = "nodejs";

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
  /** BCP-47 language tag for analysis output (e.g. "en", "tr", "de"). */
  language: z.string().min(2).max(10).optional(),
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

    const supadataKey = readSupadataApiKey();
    const pasted = parsed.data.transcriptPlain?.trim();
    const pastedOk =
      !!pasted && pasted.length >= MIN_TRANSCRIPT_PLAIN_CHARS;
    if (!supadataKey && !pastedOk) {
      return NextResponse.json(
        {
          error:
            "SUPADATA_API_KEY is not configured on the server. Add SUPADATA_API_KEY in Railway (or web/.env.local), redeploy, then open /api/health/env — supadataConfigured must be true.",
        },
        { status: 503 },
      );
    }

    const analysisLang = parsed.data.language?.slice(0, 10) ?? "en";

    const { data: cached } = await supabase
      .from("video_analyses")
      .select("analysis")
      .eq("user_id", user.id)
      .eq("video_id", parsed.data.videoId)
      .eq("language", analysisLang)
      .maybeSingle();

    if (cached?.analysis) {
      const a = cached.analysis as Record<string, unknown>;
      return NextResponse.json({
        contentKind: a.content_kind ?? a.contentKind ?? "other",
        hasSpoilers: a.has_spoilers ?? a.hasSpoilers ?? false,
        summaryDetailed: a.summary_detailed ?? a.summaryDetailed ?? "",
        summaryShort: a.summary_short ?? a.summaryShort ?? "",
        revelations: a.revelations ?? [],
        keyPoints: a.key_points ?? a.keyPoints ?? [],
        keyMoments: a.key_moments ?? a.keyMoments ?? [],
        segments: a.segments ?? [],
        hypeMoments: a.hype_moments ?? a.hypeMoments ?? [],
        transcriptDensityScore: null,
        usedVisualFallback: false,
        creditsCharged: 0,
        creditsRemaining: undefined,
        cached: true,
      });
    }

    let items: TranscriptResponse[] | null = null;
    let transcriptFetchError: { status: number; message: string } | null =
      null;
    if (supadataKey) {
      try {
        items = await fetchTranscriptRobust(parsed.data.videoId, {
          supadataApiKey: supadataKey,
        });
      } catch (e) {
        transcriptFetchError = mapTranscriptError(e);
        if (transcriptFetchError.status >= 500) {
          console.error("[video-analysis] transcript", e);
        } else {
          console.warn(
            "[video-analysis] transcript",
            transcriptFetchError.message,
          );
        }
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

    /** Billing length: metadata → caption timing → 3 min default (pasted / unknown). */
    const billingDurationSec =
      videoDurationSecForAnalysis != null && videoDurationSecForAnalysis > 0
        ? videoDurationSecForAnalysis
        : haveCaptions && items && items.length > 0
          ? (estimateDurationSecondsFromTranscriptItems(items) ?? 180)
          : 180;

    const creditCheck = await checkCreditsForAnalysis(
      supabase,
      user.id,
      billingDurationSec,
    );
    if (!creditCheck.ok) {
      return creditCheck.response;
    }
    const { creditsBefore } = creditCheck;

    const analysis = await analyzeTranscriptWithGeminiFlash({
      transcript: forModel,
      videoTitle: parsed.data.videoTitle,
      videoDurationSec: videoDurationSecForAnalysis,
      language: parsed.data.language,
    });

    const { creditsRemaining, creditsCharged } =
      await deductCreditsAfterAnalysis(
        supabase,
        billingDurationSec,
        creditsBefore,
      );

    await supabase.from("video_analyses").upsert(
      {
        user_id: user.id,
        video_id: parsed.data.videoId,
        language: analysisLang,
        analysis: analysis as unknown as Record<string, unknown>,
      },
      { onConflict: "user_id,video_id,language" },
    );

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
      creditsCharged,
      creditsRemaining,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    console.error("[video-analysis]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
