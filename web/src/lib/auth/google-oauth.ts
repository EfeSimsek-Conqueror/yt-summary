"use client";

import { isAuthError } from "@supabase/auth-js";
import { OAUTH_CALLBACK_PATH } from "@/lib/auth/oauth-callback-path";
import { getOAuthRedirectOrigin } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";

const YOUTUBE_GOOGLE_SCOPES =
  "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

/** `next` must be a path on this origin (e.g. current page). */
export async function signInWithGoogle(next: string = "/dashboard/discover") {
  const supabase = createClient();
  const origin = getOAuthRedirectOrigin();
  const safeNext = next.startsWith("/") ? next : "/dashboard/discover";
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}${OAUTH_CALLBACK_PATH}?next=${encodeURIComponent(safeNext)}`,
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
export async function linkGoogleForYoutube(next: string = "/dashboard/discover") {
  const supabase = createClient();
  const origin = getOAuthRedirectOrigin();
  const safeNext = next.startsWith("/") ? next : "/dashboard/discover";
  const { error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: {
      redirectTo: `${origin}${OAUTH_CALLBACK_PATH}?next=${encodeURIComponent(safeNext)}`,
      scopes: YOUTUBE_GOOGLE_SCOPES,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
  if (error) throw error;
}

/** Human-readable copy for failed `linkIdentity` / OAuth (shown in UI). */
export function formatGoogleAuthLinkError(err: unknown): string {
  if (isAuthError(err)) {
    if (err.code === "manual_linking_disabled") {
      return "Identity linking is off in Supabase. Dashboard → Authentication → enable “Manual identity linking”, then try again.";
    }
    if (err.code === "identity_already_exists") {
      return "This Google account is already linked. If YouTube still fails, sign out and use “Sign in with Google” once so scopes refresh.";
    }
    if (err.message?.trim()) return err.message.trim();
  }
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  return "Could not start Google connection. Try again or check Supabase Auth + Google OAuth settings.";
}
