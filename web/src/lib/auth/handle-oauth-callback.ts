import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { resolvePublicSiteUrl } from "@/lib/app-url";

/**
 * Public origin for redirects after OAuth. Do not use `new URL(request.url).origin`:
 * behind Railway/proxies the URL can be `http://0.0.0.0:8080`, which sends users to a dead address.
 */
function getPublicOriginForRedirect(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
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

/** Exchange Supabase OAuth `code` for session; redirect to `next` or error page. */
export async function handleOAuthCallback(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  /** Public site origin (Railway URL), not internal bind address (0.0.0.0). */
  const origin = getPublicOriginForRedirect(request);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
