"use client";

import { signInWithGoogle } from "@/lib/auth/google-oauth";

export function GuestLoginOverlay() {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-login-title"
    >
      <div className="pointer-events-auto max-w-sm rounded-2xl border border-line bg-surface/95 px-8 py-8 text-center shadow-xl backdrop-blur-md">
        <h2
          id="guest-login-title"
          className="text-xl font-semibold tracking-tight text-[var(--text)]"
        >
          Log in
        </h2>
        <p className="mt-2 text-sm text-muted">
          Sign in with Google to view your subscriptions and analyze videos.
        </p>
        <button
          type="button"
          onClick={() =>
            void signInWithGoogle(
              `${window.location.pathname}${window.location.search}`,
            )
          }
          className="mt-6 w-full rounded-lg border border-line bg-raised px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-surface"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
