import { Suspense } from "react";
import { BillingPlanFocus } from "@/components/billing/billing-plan-focus";
import { BillingPricingCard } from "@/components/billing/billing-pricing-card";
import { BillingStripeActions } from "@/components/billing-stripe-actions";
import { getBillingSnapshot, subscriptionStatusLabel } from "@/lib/billing/settings-billing-snapshot";
import { formatPlanPrice, PLANS, PLAN_ORDER } from "@/lib/billing/plans";
import { formatCreditsDisplay } from "@/lib/billing/video-credits";
import { createClient } from "@/lib/supabase/server";

type BillingPageProps = {
  searchParams: Promise<{ checkout?: string; plan?: string }>;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const sp = await searchParams;
  const checkoutFlag =
    typeof sp.checkout === "string" ? sp.checkout.trim() : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const snapshot = await getBillingSnapshot(
    supabase,
    user?.id ?? null,
    user?.email ?? null,
  );
  const currentPlan = PLANS[snapshot.effectivePlanId];
  const creditsDetail =
    currentPlan.creditsPeriod === "once"
      ? `${formatCreditsDisplay(snapshot.creditsRemaining)} credits included with ${currentPlan.shortName}`
      : `${formatCreditsDisplay(snapshot.creditsRemaining)} of ${currentPlan.creditsIncluded} credits this period`;

  const periodEnd =
    snapshot.currentPeriodEnd &&
    (snapshot.subscriptionStatus === "active" ||
      snapshot.subscriptionStatus === "trialing")
      ? new Date(snapshot.currentPeriodEnd).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

  const creditsPct = Math.min(
    100,
    Math.round((snapshot.creditsRemaining / currentPlan.creditsIncluded) * 100),
  );

  return (
    <div className="space-y-8">
      <Suspense fallback={null}>
        <BillingPlanFocus />
      </Suspense>

      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-300/80">
          Plan &amp; billing
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Your tier, credits, and subscription management.
        </p>
      </header>

      {checkoutFlag === "success" ? (
        <p
          className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100/95"
          role="status"
        >
          Payment successful — your subscription will update in a moment. If
          credits don&apos;t refresh, refresh this page.
        </p>
      ) : checkoutFlag === "canceled" ? (
        <p
          className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-sm text-amber-100/95"
          role="status"
        >
          Checkout was canceled. You can subscribe anytime from the buttons
          below.
        </p>
      ) : null}

      {/* Plan comparison cards — paid tiers are clickable → Stripe checkout or sign-in */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const tier = PLANS[id];
          return (
            <BillingPricingCard
              key={id}
              plan={tier}
              isCurrent={id === snapshot.effectivePlanId}
              isPopular={tier.popular === true}
              stripeConfigured={snapshot.stripeConfigured}
              isSignedIn={Boolean(user)}
            />
          );
        })}
      </div>

      {/* Credits meter */}
      <section className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/40 to-gray-950/80 p-6">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Credits remaining
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {formatCreditsDisplay(snapshot.creditsRemaining)}
              <span className="text-sm font-normal text-gray-500">
                {" "}
                / {currentPlan.creditsIncluded}
              </span>
            </p>
          </div>
          <p className="text-sm font-medium text-white">
            {formatPlanPrice(currentPlan)}
          </p>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${creditsPct}%` }}
          />
        </div>

        <p className="mt-3 text-xs text-gray-500">
          1 credit = 3 minutes of analyzed video.{" "}
          {creditsDetail}.
          {snapshot.subscriptionStatus &&
          snapshot.effectivePlanId !== "scout" ? (
            <>
              {" "}
              Status:{" "}
              <span className="text-gray-300">
                {subscriptionStatusLabel(snapshot.subscriptionStatus)}
              </span>
              {periodEnd ? (
                <>
                  {" "}· Period ends{" "}
                  <span className="text-gray-300">{periodEnd}</span>
                </>
              ) : null}
            </>
          ) : null}
        </p>
      </section>

      {/* Stripe: manage subscription (Checkout starts from plan cards above) */}
      {snapshot.stripeConfigured ? (
        <section
          id="stripe-billing-actions"
          className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/40 to-gray-950/80 p-6"
        >
          <BillingStripeActions
            hasStripeCustomer={snapshot.hasStripeCustomer}
          />
        </section>
      ) : (
        <p className="text-sm text-gray-500">
          Stripe is not configured on this deployment — add{" "}
          <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">
            STRIPE_SECRET_KEY
          </code>{" "}
          and price IDs to enable paid checkout.
        </p>
      )}
    </div>
  );
}
