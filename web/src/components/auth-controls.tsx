"use client";

import { signInWithGoogle } from "@/lib/auth/google-oauth";
import { ConnectYoutubeCta } from "@/components/connect-youtube-cta";
import { useGuestGate } from "@/components/guest-gate-context";
import { UserProfileMenu } from "@/components/user-profile-menu";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export function AuthControls() {
  const guestGate = useGuestGate();
  const [user, setUser] = useState<User | null | "pending">("pending");
  /** Google OAuth access token for YouTube Data API — missing on email-only sign-in. */
  const [hasYoutubeToken, setHasYoutubeToken] = useState<boolean | "pending">(
    "pending",
  );

  useEffect(() => {
    const supabase = createClient();

    async function syncYoutubeConnection() {
      const r = await fetch("/api/me/youtube-token", {
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as {
        connected?: boolean;
      };
      setHasYoutubeToken(Boolean(j.connected));
    }

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
    });

    void syncYoutubeConnection();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void syncYoutubeConnection();
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
    const next = `${window.location.pathname}${window.location.search}`;
    if (guestGate) {
      return (
        <button
          type="button"
          onClick={() => void signInWithGoogle(next).catch(() => {})}
          className="text-xs font-medium text-gray-400 underline-offset-4 transition hover:text-white hover:underline"
        >
          Sign in
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => void signInWithGoogle(next).catch(() => {})}
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
