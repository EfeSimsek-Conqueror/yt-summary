"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import type { PlanId } from "@/lib/billing/plans";
import { PLANS, PLAN_ORDER } from "@/lib/billing/plans";

type Props = {
  /** Effective plan (Scout + paid tiers). */
  planId: PlanId;
  /** Stripe customer exists (can open Customer Portal). */
  hasStripeCustomer: boolean;
};

export function BillingStripeActions({ planId, hasStripeCustomer }: Props) {
  const [busy, setBusy] = useState<"nav" | "cap" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(tier: "navigator" | "captain") {
    setError(null);
    setBusy(tier === "navigator" ? "nav" : "cap");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: tier }),
      });
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
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
      setBusy(null);
    }
  }

  async function openPortal() {
    setError(null);
    setBusy("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(
          typeof j.error === "string" ? j.error : "Portal could not open",
        );
        return;
      }
      if (typeof j.url === "string" && j.url.length > 0) {
        window.location.href = j.url;
        return;
      }
      setError("No portal URL returned");
    } catch {
      setError("Network error");
    } finally {
      setBusy(null);
    }
  }

  const showNavigator = planId !== "navigator";
  const showCaptain = planId !== "captain";

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Paid plans (Stripe)
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {showNavigator ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void startCheckout("navigator")}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-purple-500/40 bg-purple-500/15 px-4 py-2.5 text-sm font-medium text-purple-100 transition hover:bg-purple-500/25 disabled:opacity-50"
          >
            {busy === "nav" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Subscribe to {PLANS.navigator.shortName} — {PLANS.navigator.priceLabel}
            {PLANS.navigator.priceSubtext}
          </button>
        ) : null}
        {showCaptain ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void startCheckout("captain")}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-50"
          >
            {busy === "cap" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Subscribe to {PLANS.captain.shortName} — {PLANS.captain.priceLabel}
            {PLANS.captain.priceSubtext}
          </button>
        ) : null}
        {hasStripeCustomer ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void openPortal()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:border-gray-600 hover:bg-zinc-800 disabled:opacity-50"
          >
            {busy === "portal" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 text-gray-500" />
            )}
            Manage subscription
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-gray-500">
        Credits are refreshed each billing cycle when Stripe confirms payment (
        {PLAN_ORDER.filter((p) => p !== "scout")
          .map((p) => `${PLANS[p].creditsIncluded} for ${PLANS[p].shortName}`)
          .join(" · ")}
        ).
      </p>
    </div>
  );
}
