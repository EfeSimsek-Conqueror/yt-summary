import { persistGoogleRefreshTokenIfPresent } from "@/lib/google/resolve-google-access-token";
import { postOAuthRedirectPath, sanitizeOAuthNextPath } from "@/lib/auth/oauth-next-path";
import { getPublicOriginFromRequest } from "@/lib/auth/request-public-origin";
import { vidError, vidLog } from "@/lib/server/vid-log";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Exchange Supabase OAuth `code` for session; redirect to safe path on this origin.
 *
 * Uses `request.cookies` + `response.cookies` (not `cookies()` from next/headers) so
 * `Set-Cookie` from `exchangeCodeForSession` is attached to the redirect response.
 * See https://supabase.com/docs/guides/auth/server-side — Route Handlers must set
 * cookies on the `NextResponse` that is returned.
 */
export async function handleOAuthCallback(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const origin = getPublicOriginFromRequest(request);
  const nextPath = postOAuthRedirectPath(
    sanitizeOAuthNextPath(searchParams.get("next")),
  );

  const oauthErr = searchParams.get("error");
  const oauthErrDesc = searchParams.get("error_description");
  if (oauthErr) {
    vidError("oauth", "provider returned error", {
      error: oauthErr,
      details: oauthErrDesc?.slice(0, 300) ?? null,
      origin,
      next: nextPath,
    });
    const errDest = new URL("/auth/auth-code-error", `${origin}/`);
    errDest.searchParams.set("error", oauthErr);
    if (oauthErrDesc) {
      errDest.searchParams.set("details", oauthErrDesc.slice(0, 500));
    }
    const r = NextResponse.redirect(errDest);
    r.headers.set("Cache-Control", "private, no-store, max-age=0");
    return r;
  }

  const code = searchParams.get("code");
  if (!code) {
    vidError("oauth", "missing ?code= in callback URL", {
      origin,
      next: nextPath,
      searchParamKeys: [...searchParams.keys()],
    });
    const errDest = new URL("/auth/auth-code-error", `${origin}/`);
    errDest.searchParams.set("error", "missing_code");
    const r = NextResponse.redirect(errDest);
    r.headers.set("Cache-Control", "private, no-store, max-age=0");
    return r;
  }

  const redirectUrl = new URL(nextPath, `${origin}/`);
  let response = NextResponse.redirect(redirectUrl);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");

  const cookieNames = request.cookies.getAll().map((c) => c.name);
  vidLog("oauth", "exchanging code for session", {
    origin,
    next: nextPath,
    codeLength: code.length,
    cookieCount: cookieNames.length,
    cookieNames: cookieNames.filter((n) =>
      /sb-|supabase|auth|pkce|verifier/i.test(n),
    ),
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    vidError("oauth", "exchangeCodeForSession failed", {
      message: error.message,
      code: error.code ?? null,
      status: error.status ?? null,
      origin,
      next: nextPath,
    });
    const errDest = new URL("/auth/auth-code-error", `${origin}/`);
    errDest.searchParams.set("reason", encodeURIComponent(error.message));
    if (error.code) errDest.searchParams.set("code", String(error.code));
    const errResponse = NextResponse.redirect(errDest);
    errResponse.headers.set("Cache-Control", "private, no-store, max-age=0");
    return errResponse;
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    vidError("oauth", "getUser failed after code exchange", {
      message: userErr?.message ?? "no user",
      origin,
      next: nextPath,
    });
    const errDest = new URL("/auth/auth-code-error", `${origin}/`);
    errDest.searchParams.set(
      "reason",
      encodeURIComponent(userErr?.message ?? "Session not verified after OAuth"),
    );
    const errResponse = NextResponse.redirect(errDest);
    errResponse.headers.set("Cache-Control", "private, no-store, max-age=0");
    return errResponse;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  await persistGoogleRefreshTokenIfPresent(supabase, session);

  vidLog("oauth", "session established, redirecting", {
    origin,
    next: nextPath,
    userId: userData.user.id,
    hasProviderToken: Boolean(session?.provider_token),
    hasProviderRefresh: Boolean(session?.provider_refresh_token),
  });

  return response;
}
