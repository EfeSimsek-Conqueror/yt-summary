import { resolvePublicSiteUrl } from "@/lib/app-url";
import type { NextRequest } from "next/server";

/**
 * Public browser origin for redirects (Railway/proxy safe). Do not use
 * `request.nextUrl.origin` alone — it can be `http://0.0.0.0:8080` behind Docker.
 */
export function getPublicOriginFromRequest(request: NextRequest): string {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProtoRaw =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
  const proto =
    forwardedProtoRaw === "http" || forwardedProtoRaw === "https"
      ? forwardedProtoRaw
      : "https";

  if (forwardedHost && forwardedHost !== "0.0.0.0") {
    return `${proto}://${forwardedHost}`;
  }

  const host = request.headers.get("host")?.split(",")[0]?.trim();
  if (host && !host.startsWith("0.0.0.0")) {
    return `${proto}://${host}`;
  }

  const { hostname } = request.nextUrl;
  if (hostname !== "0.0.0.0") {
    return request.nextUrl.origin;
  }

  return resolvePublicSiteUrl();
}
