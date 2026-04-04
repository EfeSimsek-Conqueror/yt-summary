"use client";

import { signInWithGoogle } from "@/lib/auth/google-oauth";
import { ArrowLeft, BarChart3, LineChart, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { VidSumLogoMark } from "@/components/vidsum-logo-mark";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function GuestLoginOverlay() {
  return (
    <div
      className="absolute inset-0 z-30 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-login-title"
    >
      <Link
        href="/"
        className="pointer-events-auto fixed left-3 top-3 z-[100] flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white sm:left-5 sm:top-5"
        aria-label="Back to landing"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </Link>
      {/* Deep dark canvas + subtle violet lift (reference: YT Analyzer style, darker) */}
      <div className="flex min-h-full flex-col items-center justify-start bg-gradient-to-br from-black via-[#06060a] to-[#0f0c14] px-4 pb-10 pt-6 sm:px-6 sm:pt-8 md:pt-10">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(88,28,135,0.18),transparent_55%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_100%_100%,rgba(30,58,138,0.12),transparent_50%)]"
          aria-hidden
        />

        <div className="relative z-10 flex w-full max-w-md flex-col items-center">
          {/* Brand above card — sits higher under top nav */}
          <div className="mb-6 flex flex-col items-center text-center sm:mb-7">
            <div
              className="shadow-lg shadow-purple-900/40 ring-1 ring-white/10"
              aria-hidden
            >
              <VidSumLogoMark size={56} rounded="2xl" />
            </div>
            <h1
              className="mt-4 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white"
            >
              VidSum
              <Sparkles className="h-6 w-6 text-amber-200/90" aria-hidden />
            </h1>
            <p className="mt-1 max-w-xs text-sm text-zinc-500">
              Unlock the power of YouTube — transcripts, summaries, and more.
            </p>
          </div>

          {/* Card */}
          <div className="pointer-events-auto w-full rounded-3xl border border-white/[0.08] bg-[#0a0a0f]/95 p-8 shadow-2xl shadow-black/60 ring-1 ring-white/[0.04] backdrop-blur-xl">
            <h2
              id="guest-login-title"
              className="text-center text-xl font-semibold tracking-tight text-white"
            >
              Welcome back!
              <span className="ml-1.5" aria-hidden>
                👋
              </span>
            </h2>
            <p className="mt-1.5 text-center text-sm text-zinc-500">
              Sign in to access your dashboard
            </p>

            <button
              type="button"
              onClick={() =>
                void signInWithGoogle(
                  `${window.location.pathname}${window.location.search}`,
                )
              }
              className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-200/90 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 shadow-md transition hover:bg-zinc-100"
            >
              <GoogleMark className="h-5 w-5 shrink-0" />
              Continue with Google
            </button>

            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-[#0a0a0f] px-3 text-zinc-600">or</span>
              </div>
            </div>

            <Link
              href="/"
              className="flex w-full items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900/90 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800/90"
            >
              Continue as guest
            </Link>

            <div className="mt-8 border-t border-zinc-800/80 pt-6">
              <p className="text-center text-xs font-medium uppercase tracking-wide text-zinc-600">
                What you&apos;ll get
              </p>
              <ul className="mt-4 space-y-3 text-left text-sm text-zinc-400">
                <li className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25">
                    <LineChart className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="pt-1 leading-snug">
                    Advanced video analytics &amp; insights
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/25">
                    <BarChart3 className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="pt-1 leading-snug">
                    Transcript-based summaries &amp; takeaways
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/25">
                    <Zap className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="pt-1 leading-snug">
                    AI-powered chat on any video you open
                  </span>
                </li>
              </ul>
            </div>

            <p className="mt-8 text-center text-[11px] leading-relaxed text-zinc-600">
              By signing in, you agree to our{" "}
              <span className="text-violet-400/90">Terms of Service</span>
              {" "}
              and{" "}
              <span className="text-violet-400/90">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
