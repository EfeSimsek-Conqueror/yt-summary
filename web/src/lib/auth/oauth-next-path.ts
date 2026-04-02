/**
 * Safe path-only redirect after OAuth (blocks open redirects, bad encodings).
 * Default: main app feed after login.
 */
const DEFAULT_AFTER_LOGIN = "/dashboard/discover";

export function sanitizeOAuthNextPath(raw: string | null | undefined): string {
  if (raw == null || raw === "") return DEFAULT_AFTER_LOGIN;
  let s = raw.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
  s = s.trim();
  if (!s.startsWith("/")) return DEFAULT_AFTER_LOGIN;
  if (s.startsWith("//")) return DEFAULT_AFTER_LOGIN;
  if (s.includes("://")) return DEFAULT_AFTER_LOGIN;
  if (s.length > 512) return DEFAULT_AFTER_LOGIN;
  return s;
}

/** Landing `/` after OAuth → open Discover (simple “logged-in home”). */
export function postOAuthRedirectPath(safePath: string): string {
  if (safePath === "/" || safePath === "") return DEFAULT_AFTER_LOGIN;
  return safePath;
}
