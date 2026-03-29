"use client";

import { linkGoogleForYoutube } from "@/lib/auth/google-oauth";

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
  label = "Connect Google for YouTube",
  variant = "primary",
  className = "",
}: Props) {
  const base =
    variant === "primary"
      ? "rounded-lg border border-blue-500/50 bg-blue-500/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500/25"
      : "rounded-md border border-line bg-raised px-2.5 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-surface";

  return (
    <button
      type="button"
      className={`${base} ${className}`.trim()}
      onClick={() => {
        const next = `${window.location.pathname}${window.location.search}`;
        void linkGoogleForYoutube(next).catch(() => {});
      }}
    >
      {label}
    </button>
  );
}
