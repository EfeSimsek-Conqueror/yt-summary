import { Sparkles } from "lucide-react";

export function DiscoverComingSoon() {
  return (
    <div className="flex min-h-[min(60vh,520px)] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-700/80 bg-zinc-900/60 shadow-lg shadow-black/20">
        <Sparkles className="h-8 w-8 text-amber-300/90" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Discover
      </h1>
      <p className="mt-3 max-w-md text-base text-zinc-400">
        Coming soon — curated category feeds and exploration will return here.
        Use search above or your subscriptions in the meantime.
      </p>
    </div>
  );
}
