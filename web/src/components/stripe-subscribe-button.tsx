"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PLANS } from "@/lib/billing/plans";

type Tier = "navigator" | "captain";

const tierClass: Record<
  Tier,
  string
> = {
  navigator:
    "border border-purple-500/40 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25",
  captain:
    "border border-amber-500/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20",
};

type Props = {
  tier: Tier;
  className?: string;
};

/**
 * Starts Stripe Checkout for Navigator or Captain. Used on Plan & billing and marketing.
 */
export function StripeSubscribeButton({ tier, className = "" }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = PLANS[tier];

  async function startCheckout() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: tier }),
      });
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          setError("Sign in with Google first, then subscribe.");
          return;
        }
        setError(
          typeof j.error === "string" ? j.error : "Checkout could not start",
        );
        return;
      }
      if (typeof j.url === "string" && j.url.length > 0) {
        window.location.href = j.url;
        return;
      }
      setError("No checkout URL returned");
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={() => void startCheckout()}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${tierClass[tier]} ${className}`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Subscribe — {plan.priceLabel}
        {plan.priceSubtext}
      </button>
      {error ? (
        <p className="text-center text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
