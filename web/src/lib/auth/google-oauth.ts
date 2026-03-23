"use client";

import { createClient } from "@/lib/supabase/client";

/** `next` must be a path on this origin (e.g. current page). */
export async function signInWithGoogle(next: string = "/") {
  const supabase = createClient();
  const origin = window.location.origin;
  const safeNext = next.startsWith("/") ? next : "/";
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      scopes:
        "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
}
