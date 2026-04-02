import type { PlanId } from "@/lib/billing/plans";

export function getStripePriceIdForPaidPlan(
  planId: "navigator" | "captain",
): string | undefined {
  if (planId === "navigator") {
    return process.env.STRIPE_PRICE_ID_NAVIGATOR?.trim();
  }
  return process.env.STRIPE_PRICE_ID_CAPTAIN?.trim();
}

/** Map Stripe Price ID (from subscription item) to VidSum plan. */
export function planIdFromStripePriceId(priceId: string): PlanId | null {
  const nav = process.env.STRIPE_PRICE_ID_NAVIGATOR?.trim();
  const cap = process.env.STRIPE_PRICE_ID_CAPTAIN?.trim();
  if (nav && priceId === nav) return "navigator";
  if (cap && priceId === cap) return "captain";
  return null;
}
