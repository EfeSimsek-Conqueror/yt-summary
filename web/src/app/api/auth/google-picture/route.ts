import { resolveGoogleAccessToken } from "@/lib/google/resolve-google-access-token";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Returns the Google profile `picture` URL using the session's OAuth access token.
 * Use when JWT `user_metadata` omits `picture` (common with some Supabase + Google setups).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    return NextResponse.json({ picture: null }, { status: 401 });
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = await resolveGoogleAccessToken(supabase, session);
  if (!token) {
    return NextResponse.json({ picture: null }, { status: 401 });
  }

  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { picture: null },
      { status: res.status === 401 ? 401 : 502 },
    );
  }

  const data = (await res.json()) as { picture?: string };
  const picture =
    typeof data.picture === "string" && data.picture.trim().length > 0
      ? data.picture.trim()
      : null;

  return NextResponse.json({ picture });
}
