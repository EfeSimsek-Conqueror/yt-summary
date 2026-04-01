"use client";

import { signInWithGoogle } from "@/lib/auth/google-oauth";
import { ConnectYoutubeCta } from "@/components/connect-youtube-cta";
import { UserProfileMenu } from "@/components/user-profile-menu";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export function AuthControls() {
  const [user, setUser] = useState<User | null | "pending">("pending");
  /** Google OAuth access token for YouTube Data API — missing on email-only sign-in. */
  const [hasYoutubeToken, setHasYoutubeToken] = useState<boolean | "pending">(
    "pending",
  );

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasYoutubeToken(Boolean(session?.provider_token));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setHasYoutubeToken(Boolean(session?.provider_token));
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }

  if (user === "pending") {
    return (
      <div
        className="flex h-9 items-center gap-2 rounded-lg border border-gray-700 bg-zinc-900 px-2"
        aria-busy
        aria-label="Loading account"
      >
        <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-gray-700" />
        <span className="hidden text-xs text-gray-500 sm:inline">Loading…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() =>
          void signInWithGoogle(
            `${window.location.pathname}${window.location.search}`,
          ).catch(() => {})
        }
        className="rounded-lg border border-gray-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800"
      >
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {hasYoutubeToken === false ? <ConnectYoutubeCta /> : null}
      <UserProfileMenu user={user} onSignOut={signOut} />
    </div>
  );
}
