import { BillingStripeActions } from "@/components/billing-stripe-actions";
import { getBillingSnapshot, subscriptionStatusLabel } from "@/lib/billing/settings-billing-snapshot";
import { formatPlanPrice, PLANS, PLAN_ORDER, type PlanDefinition } from "@/lib/billing/plans";
import { formatCreditsDisplay } from "@/lib/billing/video-credits";
import { createClient } from "@/lib/supabase/server";
import { CheckCircle2, Crown, Sparkles, Star } from "lucide-react";

function PlanCard({
  plan,
  isCurrent,
  isPopular,
}: {
  plan: PlanDefinition;
  isCurrent: boolean;
  isPopular: boolean;
}) {
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

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-5 ${borderClass} ${bgClass}`}
    >
      {isPopular ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-purple-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-500/30">
          Popular
        </span>
      ) : null}
      {isCurrent ? (
        <span className="absolute -top-3 right-4 rounded-full bg-emerald-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
          Current
        </span>
      ) : null}

      <div className="mb-4 flex items-center gap-2">
        {plan.id === "scout" ? (
          <Star className="h-5 w-5 text-gray-400" />
        ) : plan.id === "navigator" ? (
          <Sparkles className="h-5 w-5 text-purple-400" />
        ) : (
          <Crown className="h-5 w-5 text-amber-400" />
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
    </div>
  );
}

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const snapshot = await getBillingSnapshot(supabase, user?.id ?? null);
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
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-300/80">
          Plan &amp; billing
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Your tier, credits, and subscription management.
        </p>
      </header>

      {/* Plan comparison cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PLAN_ORDER.map((id) => (
          <PlanCard
            key={id}
            plan={PLANS[id]}
            isCurrent={id === snapshot.effectivePlanId}
            isPopular={PLANS[id].popular === true}
          />
        ))}
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

      {/* Stripe actions */}
      {user && snapshot.stripeConfigured ? (
        <section className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/40 to-gray-950/80 p-6">
          <BillingStripeActions
            planId={snapshot.effectivePlanId}
            hasStripeCustomer={snapshot.hasStripeCustomer}
          />
        </section>
      ) : user && !snapshot.stripeConfigured ? (
        <p className="text-sm text-gray-500">
          Stripe is not configured on this deployment — paid checkout is
          unavailable.
        </p>
      ) : null}
    </div>
  );
}
