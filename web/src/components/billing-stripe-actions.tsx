"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { PLANS, PLAN_ORDER } from "@/lib/billing/plans";

type Props = {
  /** Stripe customer exists (can open Customer Portal). */
  hasStripeCustomer: boolean;
};

/** Manage subscription in Stripe Customer Portal. Subscribe uses plan cards above. */
export function BillingStripeActions({ hasStripeCustomer }: Props) {
  const [busy, setBusy] = useState<"portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Stripe subscription
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start">
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
        ) : (
          <p className="text-sm text-gray-400">
            Use the Subscribe buttons on the Navigator or Captain cards above.
          </p>
        )}
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
