import { OAUTH_CALLBACK_PATH } from "@/lib/auth/oauth-callback-path";
import { getPublicOriginFromRequest } from "@/lib/auth/request-public-origin";
import { NextResponse, type NextRequest } from "next/server";

/** Legacy path — forwards to {@link OAUTH_CALLBACK_PATH}. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = getPublicOriginFromRequest(request);
  const dest = new URL(OAUTH_CALLBACK_PATH, `${origin}/`);
  dest.search = url.search;
  return NextResponse.redirect(dest);
}
