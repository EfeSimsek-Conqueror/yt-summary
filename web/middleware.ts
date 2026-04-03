import { OAUTH_CALLBACK_PATH } from "@/lib/auth/oauth-callback-path";
import { getPublicOriginFromRequest } from "@/lib/auth/request-public-origin";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  /** Supabase sometimes sends `code` to Site URL root — forward to OAuth handler. */
  if (url.pathname === "/" && url.searchParams.has("code")) {
    const origin = getPublicOriginFromRequest(request);
    const dest = new URL(OAUTH_CALLBACK_PATH, `${origin}/`);
    dest.search = url.search;
    return NextResponse.redirect(dest);
  }

  let supabaseResponse = NextResponse.next({
    request,
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
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Validate session with Auth server (not only cookie JWT); refreshes cookies as needed.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health(?:/|$)|api/webhooks/stripe(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
