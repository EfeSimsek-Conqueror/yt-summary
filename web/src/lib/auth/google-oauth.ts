"use client";

import { getOAuthRedirectOrigin } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";

const YOUTUBE_GOOGLE_SCOPES =
  "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

/** `next` must be a path on this origin (e.g. current page). */
export async function signInWithGoogle(next: string = "/") {
  const supabase = createClient();
  const origin = getOAuthRedirectOrigin();
  const safeNext = next.startsWith("/") ? next : "/";
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      scopes: YOUTUBE_GOOGLE_SCOPES,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
}

/**
 * For users already signed in (e.g. email) without `session.provider_token`:
 * link Google with YouTube scope so subscriptions/search can use the Data API.
 */
export async function linkGoogleForYoutube(next: string = "/") {
  const supabase = createClient();
  const origin = getOAuthRedirectOrigin();
  const safeNext = next.startsWith("/") ? next : "/";
  const { error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      scopes: YOUTUBE_GOOGLE_SCOPES,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
  if (error) throw error;
}
