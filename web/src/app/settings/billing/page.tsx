import { PLANS } from "@/lib/billing/plans";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Matches profile menu until Supabase billing is wired. */
function getPlanSnapshot() {
  return { planId: "scout" as const, creditsRemaining: PLANS.scout.creditsIncluded };
}

export default function BillingPage() {
  const { planId, creditsRemaining } = getPlanSnapshot();
  const plan = PLANS[planId];
  const creditsDetail =
    plan.creditsPeriod === "once"
      ? `${creditsRemaining} credits included with ${plan.shortName}`
      : `${creditsRemaining} credits per month`;

  return (
    <main className="p-6 px-7 lg:p-7">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Billing & plan
        </h1>
        <p className="mt-1 text-sm text-muted">
          Your current tier and usage. Upgrade options are on the marketing site.
        </p>
      </header>

      <section className="max-w-lg space-y-4">
        <div className="rounded-xl border border-gray-800 bg-zinc-950/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Current plan
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {plan.displayName}
              </p>
              <p className="mt-1 text-sm text-muted">{creditsDetail}</p>
              <p className="mt-2 text-xs text-gray-500">
                Usage: 3 credits per 5 minutes of analyzed video.
              </p>
            </div>
            <span className="inline-flex rounded-md border border-purple-500/35 bg-purple-500/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-purple-200">
              {plan.shortName}
            </span>
          </div>
        </div>

        <Link
          href="/#pricing"
          className="flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-zinc-900/50 px-4 py-3 text-sm text-white transition hover:border-gray-700 hover:bg-zinc-900"
        >
          <span>View plans & pricing</span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-400" />
        </Link>
      </section>
    </main>
  );
}
