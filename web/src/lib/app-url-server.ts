import { headers } from "next/headers";
import {
  getExplicitPublicSiteUrlFromEnv,
  resolvePublicSiteUrl,
} from "@/lib/app-url";

/**
 * Canonical site URL for metadata (OG, metadataBase). Uses the incoming
 * request host when it differs from NEXT_PUBLIC_APP_URL so Railway / preview
 * URLs work before custom DNS (e.g. vidsum.ai) is live.
 */
export async function resolveSiteUrlForMetadata(): Promise<string> {
  const h = await headers();
  const hostRaw = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const cleanHost = hostRaw.split(",")[0]?.trim() ?? "";
  const protoRaw =
    h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
  const proto =
    protoRaw === "http" || protoRaw === "https" ? protoRaw : "https";

  if (!cleanHost) return resolvePublicSiteUrl();

  const current = `${proto}://${cleanHost}`;
  const explicit = getExplicitPublicSiteUrlFromEnv();
  if (!explicit) return current;
  try {
    if (new URL(explicit).host === cleanHost) return explicit;
  } catch {
    /* ignore */
  }
  return current;
}
