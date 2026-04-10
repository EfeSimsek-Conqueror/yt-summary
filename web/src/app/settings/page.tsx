import { GoogleAccountAvatar } from "@/components/google-account-avatar";
import { fetchAnalyzerRootHealth } from "@/lib/analyzer-api";
import {
  getBillingSnapshot,
  subscriptionStatusLabel,
} from "@/lib/billing/settings-billing-snapshot";
import { formatPlanPrice, PLANS } from "@/lib/billing/plans";
import { formatCreditsDisplay } from "@/lib/billing/video-credits";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowUpRight, Mail, Server, Sparkles, UserRound } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const analyzer = await fetchAnalyzerRootHealth();

  const email = user?.email ?? "—";
  const name =
    (user?.user_metadata?.full_name as string | undefined)?.trim() || null;

  const snapshot = await getBillingSnapshot(
    supabase,
    user?.id ?? null,
    user?.email ?? null,
  );
  const plan = PLANS[snapshot.effectivePlanId];
  const creditsDetail =
    plan.creditsPeriod === "once"
      ? `${formatCreditsDisplay(snapshot.creditsRemaining)} credits with ${plan.shortName}`
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
      <section className="overflow-hidden rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/50 to-gray-900/70 p-6 shadow-xl shadow-black/40">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {user ? (
            <GoogleAccountAvatar user={user} size="lg" />
          ) : (
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-2xl font-bold text-white shadow-lg shadow-purple-500/30"
              aria-hidden
            >
              ?
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-300/90">
              Account
            </p>
            <h2 className="mt-1 text-xl font-bold text-white md:text-2xl">
              {name ?? "Signed in with Google"}
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Profile details come from your Google account. To change name or
              email, update them in Google.
            </p>
            <ul className="mt-5 space-y-4">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900/80 ring-1 ring-gray-800">
                  <UserRound className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Name
                  </p>
                  <p className="mt-0.5 text-sm text-white">{name ?? "—"}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900/80 ring-1 ring-gray-800">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Email
                  </p>
                  <p className="mt-0.5 truncate text-sm text-white">{email}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-purple-500/35 bg-gradient-to-br from-purple-900/25 via-gray-900/40 to-pink-900/20 p-6 shadow-lg shadow-purple-900/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/40 to-pink-500/30 ring-1 ring-purple-500/40">
              <Sparkles className="h-5 w-5 text-purple-200" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-200/80">
                Membership
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-white">
                {plan.displayName}
              </h2>
              <p className="mt-1 text-sm text-gray-300">{creditsDetail}</p>
              {snapshot.subscriptionStatus &&
              snapshot.effectivePlanId !== "scout" ? (
                <p className="mt-2 text-xs text-gray-400">
                  Status:{" "}
                  <span className="font-medium text-gray-200">
                    {subscriptionStatusLabel(snapshot.subscriptionStatus)}
                  </span>
                  {periodEnd ? (
                    <>
                      {" "}
                      · Current period ends{" "}
                      <span className="text-gray-200">{periodEnd}</span>
                    </>
                  ) : null}
                </p>
              ) : (
                <p className="mt-2 text-xs text-gray-400">
                  {plan.creditsPeriod === "once"
                    ? "Free tier — upgrade anytime for monthly credits."
                    : null}
                </p>
              )}
              <p className="mt-2 text-sm font-medium text-white">
                {formatPlanPrice(plan)}
              </p>
            </div>
          </div>
          <span className="inline-flex rounded-lg border border-purple-500/40 bg-purple-500/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-purple-100">
            {plan.shortName}
          </span>
        </div>

        <div className="mt-6">
          <Link
            href="/settings/billing"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:shadow-purple-500/40"
          >
            Manage plan & billing
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          {!snapshot.stripeConfigured ? (
            <p className="mt-3 text-xs text-gray-500">
              Stripe is not configured on this deployment — paid checkout is
              unavailable.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/40 to-gray-950/80 p-6">
        <div className="border-b border-gray-800/80 pb-4">
          <h2 className="text-sm font-semibold text-white">
            YouTube Analyzer API
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Optional backend (Railway). Not the same URL as this Next.js app.
          </p>
        </div>
        <div className="flex items-start gap-3 pt-5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-gray-800">
            <Server className="h-4 w-4 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1 text-sm">
            {!analyzer.configured ? (
              <p className="text-gray-400">
                Not configured — set{" "}
                <code className="rounded bg-zinc-900 px-1 py-0.5 text-[11px]">
                  NEXT_PUBLIC_ANALYZER_API_URL
                </code>{" "}
                or{" "}
                <code className="rounded bg-zinc-900 px-1 py-0.5 text-[11px]">
                  ANALYZER_API_URL
                </code>{" "}
                in{" "}
                <code className="rounded bg-zinc-900 px-1 py-0.5 text-[11px]">
                  web/.env.local
                </code>
                .
              </p>
            ) : analyzer.reachable ? (
              <>
                <p className="font-medium text-emerald-400/90">Reachable</p>
                <p className="mt-1 break-all text-xs text-gray-500">
                  {analyzer.host}
                  {analyzer.version ? ` · v${analyzer.version}` : ""}
                </p>
                {analyzer.message ? (
                  <p className="mt-1 text-xs text-gray-400">{analyzer.message}</p>
                ) : null}
              </>
            ) : (
              <>
                <p className="font-medium text-amber-400/90">Unreachable</p>
                <p className="mt-1 break-all text-xs text-gray-500">
                  {analyzer.host}
                  {analyzer.error ? ` — ${analyzer.error}` : ""}
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
