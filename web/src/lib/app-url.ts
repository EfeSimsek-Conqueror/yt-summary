/**
 * When set (e.g. http://localhost:3000), OAuth and post-login redirects use this
 * origin instead of the request URL. Fixes wrong ports when Supabase "Site URL"
 * or the browser tab does not match `next dev` (port 3000).
 */
export function getPublicAppOrigin(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return undefined;
  return raw.replace(/\/$/, "");
}

/** Client: OAuth redirect base — env wins over window.location.origin. */
export function getOAuthRedirectOrigin(): string {
  const fromEnv = getPublicAppOrigin();
  if (fromEnv) return fromEnv;
  return typeof window !== "undefined" ? window.location.origin : "";
}
