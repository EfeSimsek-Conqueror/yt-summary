import { resolveGoogleAccessToken } from "@/lib/google/resolve-google-access-token";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Whether the server can obtain a Google access token (session or refresh).
 * Used by the client header so “Connect YouTube” hides after refresh when JWT omits provider_token.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    return NextResponse.json({ connected: false });
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = await resolveGoogleAccessToken(supabase, session);
  return NextResponse.json({ connected: Boolean(token) });
}
