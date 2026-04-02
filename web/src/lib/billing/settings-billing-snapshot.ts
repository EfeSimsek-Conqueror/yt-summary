import type { SupabaseClient } from "@supabase/supabase-js";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { effectivePlanIdFromSubscriptionRow } from "@/lib/billing/resolve-plan";

export type BillingSnapshot = {
  creditsRemaining: number;
  effectivePlanId: PlanId;
  hasStripeCustomer: boolean;
  /** Raw `billing_subscriptions.status` when a row exists. */
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  stripeConfigured: boolean;
};

export async function getBillingSnapshot(
  supabase: SupabaseClient,
  userId: string | null,
): Promise<BillingSnapshot> {
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY?.trim());

  if (!userId) {
    return {
      creditsRemaining: PLANS.scout.creditsIncluded,
      effectivePlanId: "scout",
      hasStripeCustomer: false,
      subscriptionStatus: null,
      currentPeriodEnd: null,
      stripeConfigured,
    };
  }

  let creditsRemaining = PLANS.scout.creditsIncluded;
  const { data: creditRow } = await supabase
    .from("user_credits")
    .select("credits_remaining")
    .eq("user_id", userId)
    .maybeSingle();
  if (creditRow) creditsRemaining = Number(creditRow.credits_remaining);

  const { data: subRow } = await supabase
    .from("billing_subscriptions")
    .select("plan_id, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const effectivePlanId = effectivePlanIdFromSubscriptionRow(
    subRow
      ? {
          plan_id: subRow.plan_id as string,
          status: subRow.status as string,
        }
      : null,
  );

  const { data: custRow } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    creditsRemaining,
    effectivePlanId,
    hasStripeCustomer: Boolean(custRow?.stripe_customer_id),
    subscriptionStatus: subRow?.status ?? null,
    currentPeriodEnd: subRow?.current_period_end ?? null,
    stripeConfigured,
  };
}

/** Human-readable Stripe mirror status for settings UI. */
export function subscriptionStatusLabel(status: string | null): string {
  if (!status) return "—";
  const key = status.toLowerCase();
  const map: Record<string, string> = {
    active: "Active",
    trialing: "Trialing",
    canceled: "Canceled",
    past_due: "Past due",
    unpaid: "Unpaid",
    incomplete: "Incomplete",
    incomplete_expired: "Incomplete (expired)",
    inactive: "Inactive",
  };
  return map[key] ?? status.replace(/_/g, " ");
}
