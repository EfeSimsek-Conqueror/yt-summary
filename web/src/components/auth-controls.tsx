"use client";

import { signInWithGoogle } from "@/lib/auth/google-oauth";
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

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }

  if (user === "pending") {
    return (
      <div className="h-9 w-9 rounded-full border border-gray-700 bg-zinc-900" />
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
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[160px] truncate text-xs text-gray-400 sm:inline">
        {user.email ?? user.user_metadata?.full_name ?? "Account"}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-lg px-2 py-1 text-xs text-gray-400 transition hover:bg-zinc-900 hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}
