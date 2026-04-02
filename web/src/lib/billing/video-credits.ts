import { SECONDS_PER_CREDIT } from "@/lib/billing/plans";

/**
 * Credits charged for a video of this length. 3 minutes = 1 credit (proportional).
 * Example: 3:10 → 190s → 190/180 ≈ 1.0556 credits.
 */
export function creditsForDurationSeconds(durationSec: number): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return 1;
  }
  const raw = durationSec / SECONDS_PER_CREDIT;
  const rounded = Math.round(raw * 10_000) / 10_000;
  return Math.max(0.0001, rounded);
}

/** Display helper — up to 2 decimal places, trim trailing zeros. */
export function formatCreditsDisplay(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded
    .toFixed(2)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}
