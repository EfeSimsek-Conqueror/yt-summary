import { BillingStripeActions } from "@/components/billing-stripe-actions";
import { getBillingSnapshot } from "@/lib/billing/settings-billing-snapshot";
import { formatPlanPrice, PLANS } from "@/lib/billing/plans";
import { formatCreditsDisplay } from "@/lib/billing/video-credits";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const snapshot = await getBillingSnapshot(supabase, user?.id ?? null);
  const plan = PLANS[snapshot.effectivePlanId];
  const creditsDetail =
    plan.creditsPeriod === "once"
      ? `${formatCreditsDisplay(snapshot.creditsRemaining)} credits included with ${plan.shortName}`
      : `${formatCreditsDisplay(snapshot.creditsRemaining)} credits this billing period`;

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

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-300/80">
          Plan & billing
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Your tier, credits, and Stripe checkout or customer portal.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-600/25 via-gray-900/50 to-pink-900/20 p-6 shadow-xl shadow-purple-900/40 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Current plan
            </p>
            <p className="mt-2 text-2xl font-bold text-white md:text-3xl">
              {plan.displayName}
            </p>
            <p className="mt-2 text-sm text-gray-300">{creditsDetail}</p>
            {periodEnd ? (
              <p className="mt-2 text-xs text-gray-500">
                Billing period ends{" "}
                <span className="text-gray-300">{periodEnd}</span>
              </p>
            ) : null}
            <p className="mt-4 text-lg font-semibold text-white">
              {formatPlanPrice(plan)}
            </p>
          </div>
          <span className="inline-flex rounded-lg border border-purple-500/45 bg-purple-500/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-purple-100">
            {plan.shortName}
          </span>
        </div>

        <ul className="mt-6 space-y-2 border-t border-white/10 pt-6 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            Usage: 1 credit per 3 minutes of analyzed video (scaled to length).
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            Upgrade or manage payment methods in Stripe when you subscribe.
          </li>
        </ul>
      </section>

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

      <Link
        href="/#pricing"
        className="flex items-center justify-between gap-3 rounded-2xl border border-gray-700/50 bg-gradient-to-r from-gray-900/80 to-zinc-900/50 px-5 py-4 text-sm font-medium text-white transition hover:border-purple-500/40 hover:from-purple-950/40 hover:to-pink-950/30"
      >
        <span>Compare plans on the landing page</span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-400" />
      </Link>
    </div>
  );
}
