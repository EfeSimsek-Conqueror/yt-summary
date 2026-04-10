/**
 * Hard-coded allowlist: these accounts skip credit checks and RPC deduction for
 * video analysis. UI shows {@link UNLIMITED_CREDITS_UI_VALUE} as balance.
 * Keep this list tiny and intentional.
 */
const NORMALIZED_EMAILS = new Set(["marbellaefe@gmail.com"]);

export function hasUnlimitedAnalysisCredits(
  email: string | null | undefined,
): boolean {
  const e = email?.trim().toLowerCase();
  return Boolean(e && NORMALIZED_EMAILS.has(e));
}

/** Display-only balance for profile / billing meter (avoid 402, no DB change). */
export const UNLIMITED_CREDITS_UI_VALUE = 999_999;
