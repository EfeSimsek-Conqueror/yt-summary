import { OAUTH_CALLBACK_PATH } from "@/lib/auth/oauth-callback-path";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  /** Supabase sometimes sends `code` to Site URL root — forward to OAuth handler. */
  if (url.pathname === "/" && url.searchParams.has("code")) {
    const dest = new URL(OAUTH_CALLBACK_PATH, url.origin);
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

  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health(?:/|$)|api/webhooks/stripe(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
