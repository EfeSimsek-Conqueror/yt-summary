import { persistGoogleRefreshTokenIfPresent } from "@/lib/google/resolve-google-access-token";
import { postOAuthRedirectPath, sanitizeOAuthNextPath } from "@/lib/auth/oauth-next-path";
import { getPublicOriginFromRequest } from "@/lib/auth/request-public-origin";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

/** Exchange Supabase OAuth `code` for session; redirect to safe path on this origin. */
export async function handleOAuthCallback(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const origin = getPublicOriginFromRequest(request);
  const code = searchParams.get("code");
  const nextPath = postOAuthRedirectPath(
    sanitizeOAuthNextPath(searchParams.get("next")),
  );

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await persistGoogleRefreshTokenIfPresent(supabase, session);
      const dest = new URL(nextPath, `${origin}/`);
      return NextResponse.redirect(dest);
    }
  }

  const errDest = new URL("/auth/auth-code-error", `${origin}/`);
  return NextResponse.redirect(errDest);
}
