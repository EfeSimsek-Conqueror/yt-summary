"use client";

import { useState } from "react";
import { CheckCircle2, Crown, Loader2, Sparkles, Star } from "lucide-react";
import { signInWithGoogle } from "@/lib/auth/google-oauth";
import type { PlanDefinition } from "@/lib/billing/plans";

type Tier = "navigator" | "captain";

type Props = {
  plan: PlanDefinition;
  isCurrent: boolean;
  isPopular: boolean;
  stripeConfigured: boolean;
  isSignedIn: boolean;
};

async function startStripeCheckout(tier: Tier): Promise<
  | { ok: true; url: string }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId: tier }),
  });
  const j = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) {
    if (res.status === 401) {
      return { ok: false, error: "Sign in with Google first, then try again." };
    }
    return {
      ok: false,
      error:
        typeof j.error === "string" ? j.error : "Checkout could not start",
    };
  }
  if (typeof j.url === "string" && j.url.length > 0) {
    return { ok: true, url: j.url };
  }
  return { ok: false, error: "No checkout URL returned" };
}

export function BillingPricingCard({
  plan,
  isCurrent,
  isPopular,
  stripeConfigured,
  isSignedIn,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPaid = plan.id === "navigator" || plan.id === "captain";
  const canOpenCheckout =
    isPaid && !isCurrent && stripeConfigured && isSignedIn;
  const needsSignIn = isPaid && !isCurrent && stripeConfigured && !isSignedIn;
  const isClickable = canOpenCheckout || needsSignIn;

  async function onActivate() {
    setError(null);
    if (needsSignIn) {
      void signInWithGoogle(`/settings/billing?plan=${plan.id}`);
      return;
    }
    if (!canOpenCheckout) return;
    setBusy(true);
    try {
      const tier = plan.id as Tier;
      const result = await startStripeCheckout(tier);
      if (result.ok) {
        window.location.href = result.url;
        return;
      }
      setError(result.error);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const borderClass = isCurrent
    ? "border-purple-500/60 ring-1 ring-purple-500/30"
    : plan.id === "captain"
      ? "border-amber-500/30"
      : "border-gray-700/50";

  const bgClass = isCurrent
    ? "bg-gradient-to-b from-purple-900/30 to-gray-950/80"
    : plan.id === "captain"
      ? "bg-gradient-to-b from-amber-900/15 to-gray-950/80"
      : "bg-gradient-to-b from-gray-800/30 to-gray-950/80";

  const interactiveClass = isClickable
    ? "cursor-pointer text-left transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
    : "";

  const shellClass = `relative flex w-full flex-col rounded-2xl border p-5 ${borderClass} ${bgClass} ${interactiveClass} ${
    busy ? "pointer-events-none opacity-80" : ""
  }`;

  const body = (
    <>
      {isPopular ? (
        <span className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-purple-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-500/30">
          Popular
        </span>
      ) : null}
      {isCurrent ? (
        <span className="pointer-events-none absolute -top-3 right-4 rounded-full bg-emerald-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
          Current
        </span>
      ) : null}

      <div className="mb-4 flex items-center gap-2">
        {plan.id === "scout" ? (
          <Star className="h-5 w-5 text-gray-400" aria-hidden />
        ) : plan.id === "navigator" ? (
          <Sparkles className="h-5 w-5 text-purple-400" aria-hidden />
        ) : (
          <Crown className="h-5 w-5 text-amber-400" aria-hidden />
        )}
        <h3 className="text-lg font-bold text-white">{plan.shortName}</h3>
      </div>

      <p className="text-3xl font-bold text-white">
        {plan.priceLabel}
        <span className="text-sm font-normal text-gray-400">
          {plan.priceSubtext}
        </span>
      </p>

      <p className="mt-3 text-sm text-gray-300">
        {plan.creditsIncluded} credits
        {plan.creditsPeriod === "month" ? " / month" : " (one-time)"}
      </p>

      <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-400">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
          AI summaries &amp; segments
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
          Video chat assistant
        </li>
        {plan.id !== "scout" ? (
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            Playlist background analysis
          </li>
        ) : null}
        {plan.id === "captain" ? (
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            Priority analysis queue
          </li>
        ) : null}
      </ul>

      {isClickable ? (
        <p className="mt-5 border-t border-gray-700/50 pt-4 text-center text-xs font-medium text-purple-200/90">
          {needsSignIn
            ? "Click to sign in and pay with Stripe"
            : `Click anywhere to open Stripe checkout — ${plan.priceLabel}${plan.priceSubtext}`}
        </p>
      ) : isPaid && !isCurrent && !stripeConfigured ? (
        <p className="mt-5 border-t border-gray-700/50 pt-4 text-center text-xs text-gray-500">
          Stripe not configured on this server
        </p>
      ) : null}

      {busy ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-[2px]"
          aria-busy
        >
          <Loader2 className="h-8 w-8 animate-spin text-purple-300" />
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-center text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        className={shellClass}
        onClick={() => void onActivate()}
        aria-label={
          needsSignIn
            ? `Sign in to subscribe to ${plan.shortName}`
            : `Subscribe to ${plan.shortName} with Stripe`
        }
      >
        {body}
      </button>
    );
  }

  return <div className={shellClass}>{body}</div>;
}
