import { fetchAnalyzerRootHealth } from "@/lib/analyzer-api";
import { createClient } from "@/lib/supabase/server";
import { Mail, Server, UserRound } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const analyzer = await fetchAnalyzerRootHealth();

  const email = user?.email ?? "—";
  const name =
    (user?.user_metadata?.full_name as string | undefined)?.trim() || null;

  return (
    <main className="p-6 px-7 lg:p-7">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Account details for your VidSum profile.
        </p>
      </header>

      <section className="max-w-lg rounded-xl border border-gray-800 bg-zinc-950/80">
        <div className="border-b border-gray-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Account</h2>
          <p className="text-xs text-muted">
            Signed in with Google. Email is managed by your Google account.
          </p>
        </div>
        <ul className="divide-y divide-gray-800">
          <li className="flex items-start gap-3 px-4 py-4">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-gray-800">
              <UserRound className="h-4 w-4 text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Name
              </p>
              <p className="mt-0.5 text-sm text-white">{name ?? "—"}</p>
            </div>
          </li>
          <li className="flex items-start gap-3 px-4 py-4">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-gray-800">
              <Mail className="h-4 w-4 text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Email
              </p>
              <p className="mt-0.5 truncate text-sm text-white">{email}</p>
            </div>
          </li>
        </ul>
      </section>

      <section className="mt-8 max-w-lg rounded-xl border border-gray-800 bg-zinc-950/80">
        <div className="border-b border-gray-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">
            YouTube Analyzer API
          </h2>
          <p className="text-xs text-muted">
            Optional backend (Railway). Set{" "}
            <code className="rounded bg-zinc-900 px-1 py-0.5 text-[11px]">
              NEXT_PUBLIC_ANALYZER_API_URL
            </code>{" "}
            or{" "}
            <code className="rounded bg-zinc-900 px-1 py-0.5 text-[11px]">
              ANALYZER_API_URL
            </code>{" "}
            — not the same as your Next.js app URL.
          </p>
        </div>
        <div className="flex items-start gap-3 px-4 py-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-gray-800">
            <Server className="h-4 w-4 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1 text-sm">
            {!analyzer.configured ? (
              <p className="text-muted">
                Not configured — add the analyzer base URL in{" "}
                <code className="rounded bg-zinc-900 px-1 py-0.5 text-[11px]">
                  web/.env.local
                </code>{" "}
                or Railway variables.
              </p>
            ) : analyzer.reachable ? (
              <>
                <p className="font-medium text-emerald-400/90">Reachable</p>
                <p className="mt-1 break-all text-xs text-muted">
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
                <p className="mt-1 break-all text-xs text-muted">
                  {analyzer.host}
                  {analyzer.error ? ` — ${analyzer.error}` : ""}
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
