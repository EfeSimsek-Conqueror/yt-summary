import { defaultDashboardAfterLogin } from "@/lib/discover-enabled";

/**
 * Safe path-only redirect after OAuth (blocks open redirects, bad encodings).
 * Default: Discover when enabled, otherwise `/dashboard` (subscription feed).
 */
export function sanitizeOAuthNextPath(raw: string | null | undefined): string {
  const fallback = defaultDashboardAfterLogin();
  if (raw == null || raw === "") return fallback;
  let s = raw.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    return fallback;
  }
  s = s.trim();
  if (!s.startsWith("/")) return fallback;
  if (s.startsWith("//")) return fallback;
  if (s.includes("://")) return fallback;
  if (s.length > 512) return fallback;
  return s;
}

/** Landing `/` after OAuth → Discover or dashboard home depending on feature flag. */
export function postOAuthRedirectPath(safePath: string): string {
  const fallback = defaultDashboardAfterLogin();
  if (safePath === "/" || safePath === "") return fallback;
  return safePath;
}
