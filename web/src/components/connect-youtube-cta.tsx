"use client";

import {
  formatGoogleAuthLinkError,
  linkGoogleForYoutube,
  signInWithGoogle,
} from "@/lib/auth/google-oauth";
import { useState } from "react";

type Props = {
  label?: string;
  variant?: "primary" | "subtle";
  className?: string;
};

/**
 * Links Google to the current Supabase user with `youtube.readonly` (and profile scopes).
 * Required for `session.provider_token` used by YouTube Data API v3 (subs, search, uploads).
 */
export function ConnectYoutubeCta({
  label = "Allow YouTube access",
  variant = "primary",
  className = "",
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base =
    variant === "primary"
      ? "rounded-lg border border-blue-500/50 bg-blue-500/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500/25 disabled:opacity-60"
      : "rounded-md border border-line bg-raised px-2.5 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-surface disabled:opacity-60";

  return (
    <div className="flex min-w-0 flex-col items-stretch gap-1.5">
      <button
        type="button"
        disabled={busy}
        className={`${base} ${className}`.trim()}
        onClick={() => {
          setError(null);
          setBusy(true);
          const next = `${window.location.pathname}${window.location.search}`;
          void signInWithGoogle(next)
            .catch((e: unknown) => {
              setError(formatGoogleAuthLinkError(e));
            })
            .finally(() => {
              setBusy(false);
            });
        }}
      >
        {busy ? "Opening Google…" : label}
      </button>
      {error ? (
        <p
          className="max-w-md text-[11px] leading-snug text-red-300/95"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
