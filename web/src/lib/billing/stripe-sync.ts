import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { planIdFromStripePriceId } from "@/lib/billing/stripe-plans";

export function userIdFromStripeSubscription(sub: Stripe.Subscription): string | null {
  const m = sub.metadata?.supabase_user_id;
  return typeof m === "string" && m.trim().length > 0 ? m.trim() : null;
}

export async function upsertBillingSubscriptionRow(
  service: SupabaseClient,
  userId: string,
  sub: Stripe.Subscription,
  planId: PlanId,
): Promise<void> {
  const { error } = await service.from("billing_subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: sub.id,
      plan_id: planId,
      status: sub.status,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

/** Monthly credit allocation for paid tiers (invoice paid / renewal). */
export async function applyMonthlyCreditsForPlan(
  service: SupabaseClient,
  userId: string,
  planId: PlanId,
): Promise<void> {
  if (planId === "scout") return;
  const pool = PLANS[planId].creditsIncluded;
  const { error } = await service.from("user_credits").upsert(
    {
      user_id: userId,
      credits_remaining: pool,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function markSubscriptionCanceled(
  service: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await service.from("billing_subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: null,
      plan_id: "scout",
      status: "canceled",
      current_period_end: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export function planIdFromSubscription(
  sub: Stripe.Subscription,
): PlanId | null {
  const priceId = sub.items.data[0]?.price?.id;
  if (!priceId) return null;
  return planIdFromStripePriceId(priceId);
}
