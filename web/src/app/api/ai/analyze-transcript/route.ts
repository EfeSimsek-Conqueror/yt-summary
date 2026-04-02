import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { analyzeTranscriptWithGeminiFlash } from "@/lib/ai/analyze-transcript";
import {
  checkCreditsForAnalysis,
  deductCreditsAfterAnalysis,
} from "@/lib/billing/analysis-credits-server";
import { getFalKey } from "@/lib/ai/fal-openai";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  transcript: z.string().min(1).max(200_000),
  videoTitle: z.string().max(500).optional(),
  videoDurationSec: z.number().positive().max(86400).optional(),
});

/**
 * POST /api/ai/analyze-transcript
 * Body: { transcript: string, videoTitle?: string }
 * Requires: logged-in user + FAL_KEY on server.
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

    const billingDurationSec =
      parsed.data.videoDurationSec != null && parsed.data.videoDurationSec > 0
        ? Math.round(parsed.data.videoDurationSec)
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

    const analysis = await analyzeTranscriptWithGeminiFlash(parsed.data);
    const { creditsRemaining, creditsCharged } =
      await deductCreditsAfterAnalysis(
        supabase,
        billingDurationSec,
        creditsBefore,
      );

    return NextResponse.json({
      ...analysis,
      creditsCharged,
      creditsRemaining,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    console.error("[analyze-transcript]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
