/**
 * Canonical site URL from env. `NEXT_PUBLIC_SITE_URL` is an alias (some dashboards
 * use that name instead of `NEXT_PUBLIC_APP_URL`).
 */
export function getExplicitPublicSiteUrlFromEnv(): string | undefined {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return undefined;
  return raw.replace(/\/$/, "");
}

/**
 * When set (e.g. http://localhost:3000), OAuth can use this origin — but if it
 * does not match where the user actually opened the app (e.g. env = vidsum.ai
 * while browsing Railway URL), {@link getOAuthRedirectOrigin} ignores it.
 */
export function getPublicAppOrigin(): string | undefined {
  return getExplicitPublicSiteUrlFromEnv();
}

/**
 * Server / metadata: canonical public URL without hardcoding a domain.
 * Priority: NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL → Railway → Vercel → localhost.
 */
export function resolvePublicSiteUrl(): string {
  const explicit = getExplicitPublicSiteUrlFromEnv();
  if (explicit) return explicit;

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railway) {
    const host = railway.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

/**
 * OAuth `redirectTo` origin. In the browser we **always** use the current tab’s
 * origin so `NEXT_PUBLIC_APP_URL` (e.g. stale vidsum.ai in .env) can never send
 * Google/Supabase back to a dead domain. Add each origin you use to Supabase
 * Redirect URLs (e.g. `http://localhost:3000/oauth/return` and
 * `http://127.0.0.1:3000/oauth/return`).
 */
export function getOAuthRedirectOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getPublicAppOrigin() ?? "";
}
