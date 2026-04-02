import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/billing/plans";
import { effectivePlanIdFromSubscriptionRow } from "@/lib/billing/resolve-plan";

export const runtime = "nodejs";

/**
 * GET /api/me/credits — current balance for the signed-in user (profile menu, billing).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row } = await supabase
    .from("user_credits")
    .select("credits_remaining")
    .eq("user_id", user.id)
    .maybeSingle();

  const creditsRemaining =
    row != null ? Number(row.credits_remaining) : PLANS.scout.creditsIncluded;

  const { data: subRow } = await supabase
    .from("billing_subscriptions")
    .select("plan_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const planId = effectivePlanIdFromSubscriptionRow(
    subRow
      ? {
          plan_id: subRow.plan_id as string,
          status: subRow.status as string,
        }
      : null,
  );

  return NextResponse.json({
    creditsRemaining,
    planId,
  });
}
