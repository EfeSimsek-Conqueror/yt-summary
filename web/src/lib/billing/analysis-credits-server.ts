import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { creditsForDurationSeconds } from "@/lib/billing/video-credits";
import {
  hasUnlimitedAnalysisCredits,
  UNLIMITED_CREDITS_UI_VALUE,
} from "@/lib/billing/unlimited-credits-allowlist";

export async function checkCreditsForAnalysis(
  supabase: SupabaseClient,
  userId: string,
  billingDurationSec: number,
  userEmail?: string | null,
): Promise<
  | { ok: true; creditsBefore: number; cost: number; skipDeduction: boolean }
  | { ok: false; response: NextResponse }
> {
  const cost = creditsForDurationSeconds(billingDurationSec);
  if (hasUnlimitedAnalysisCredits(userEmail)) {
    return {
      ok: true,
      creditsBefore: 0,
      cost,
      skipDeduction: true,
    };
  }
  const { data: ucRow } = await supabase
    .from("user_credits")
    .select("credits_remaining")
    .eq("user_id", userId)
    .maybeSingle();
  const creditsBefore = ucRow != null ? Number(ucRow.credits_remaining) : 5;
  if (creditsBefore < cost) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "insufficient_credits",
          message: `Not enough credits. This analysis needs about ${cost.toFixed(4)} credits; you have ${creditsBefore.toFixed(4)}.`,
          required: cost,
          remaining: creditsBefore,
        },
        { status: 402 },
      ),
    };
  }
  return { ok: true, creditsBefore, cost, skipDeduction: false };
}

export async function deductCreditsAfterAnalysis(
  supabase: SupabaseClient,
  billingDurationSec: number,
  creditsBefore: number,
  options?: { skipDeduction?: boolean },
): Promise<{ creditsRemaining: number; creditsCharged?: number }> {
  if (options?.skipDeduction) {
    return {
      creditsRemaining: UNLIMITED_CREDITS_UI_VALUE,
      creditsCharged: 0,
    };
  }

  const { data: deductRpc } = await supabase.rpc("deduct_analysis_credits", {
    p_duration_seconds: billingDurationSec,
  });

  const deduct = deductRpc as {
    ok?: boolean;
    deducted?: number;
    remaining?: number;
  } | null;

  if (!deduct?.ok) {
    console.error("[credits] deduct_analysis_credits", deduct);
  }

  const creditsRemaining =
    deduct?.ok === true && typeof deduct.remaining === "number"
      ? deduct.remaining
      : creditsBefore;
  const creditsCharged =
    deduct?.ok === true && typeof deduct.deducted === "number"
      ? deduct.deducted
      : undefined;

  return { creditsRemaining, creditsCharged };
}
