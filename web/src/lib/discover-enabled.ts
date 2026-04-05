/**
 * Discover hub at `/dashboard/discover`. When disabled (default), the route shows
 * Coming soon and skips per-category YouTube searches (saves Data API quota).
 * Set `NEXT_PUBLIC_DISCOVER_ENABLED=true` to restore the full Discover page.
 */
export function isDiscoverEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DISCOVER_ENABLED === "true";
}

/** Default `next` path for Google OAuth when the caller does not pass one. */
export function defaultDashboardAfterLogin(): string {
  return isDiscoverEnabled() ? "/dashboard/discover" : "/dashboard";
}
