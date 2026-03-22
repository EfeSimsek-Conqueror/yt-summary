"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export function AuthControls() {
  const [user, setUser] = useState<User | null | "pending">("pending");

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    const supabase = createClient();
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/`,
        scopes:
          "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }

  if (user === "pending") {
    return (
      <div className="h-9 w-9 rounded-full border border-line bg-raised" />
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        className="rounded-lg border border-line bg-raised px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:bg-surface"
      >
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[140px] truncate text-xs text-muted sm:inline">
        {user.email ?? user.user_metadata?.full_name ?? "Account"}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-raised hover:text-[var(--text)]"
      >
        Sign out
      </button>
    </div>
  );
}
