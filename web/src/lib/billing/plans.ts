/**
 * VidSum tier names and credit limits. Used by landing UI and (later) billing.
 * Usage: 3 credits per 5 minutes of analyzed video.
 */

export type PlanId = "scout" | "navigator" | "captain";

export const CREDITS_PER_5_MIN_BLOCK = 3;

export type PlanDefinition = {
  id: PlanId;
  /** Full product name for marketing */
  displayName: string;
  /** Short name (Scout / Navigator / Captain) */
  shortName: string;
  /** Credits included: Scout = one-time pool; paid tiers = per month */
  creditsIncluded: number;
  creditsPeriod: "once" | "month";
  /** Shown on pricing cards (e.g. "$19") */
  priceLabel: string;
  priceSubtext: string;
  /** Highlight middle tier */
  popular?: boolean;
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  scout: {
    id: "scout",
    displayName: "VidSum Scout",
    shortName: "Scout",
    creditsIncluded: 5,
    creditsPeriod: "once",
    priceLabel: "$0",
    priceSubtext: "/month",
  },
  navigator: {
    id: "navigator",
    displayName: "VidSum Navigator",
    shortName: "Navigator",
    creditsIncluded: 60,
    creditsPeriod: "month",
    priceLabel: "$19",
    priceSubtext: "/month",
    popular: true,
  },
  captain: {
    id: "captain",
    displayName: "VidSum Captain",
    shortName: "Captain",
    creditsIncluded: 180,
    creditsPeriod: "month",
    priceLabel: "$49",
    priceSubtext: "/month",
  },
};

export const PLAN_ORDER: PlanId[] = ["scout", "navigator", "captain"];
