import Image from "next/image";
import Link from "next/link";
import { Compass } from "lucide-react";
import { VidSumWordmark } from "@/components/vidsum-wordmark";
import type { Channel } from "@/lib/types";

type Props = {
  channels: Channel[];
  activeChannelId: string;
  /** When true, no subscription row is highlighted (e.g. global search mode). */
  suppressActiveChannel?: boolean;
  /** Which top-level sidebar item is active. */
  sidebarActiveView?: "dashboard" | "discover";
};

export function SubscriptionSidebar({
  channels,
  activeChannelId,
  suppressActiveChannel = false,
  sidebarActiveView = "dashboard",
}: Props) {
  return (
    <aside
      className="w-[280px] shrink-0 border-r border-gray-800 bg-zinc-950 py-4 pl-3 pr-2"
      aria-label="Sidebar"
    >
      <Link
        href="/dashboard/discover"
        className="mb-4 flex min-w-0 items-center px-3 py-1 transition-opacity hover:opacity-90"
      >
        <VidSumWordmark size="md" />
      </Link>
      <Link
        href="/dashboard/discover"
        className={`mb-5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          sidebarActiveView === "discover"
            ? "bg-blue-600/15 text-white outline outline-1 outline-blue-500/40"
            : "text-white hover:bg-zinc-900"
        }`}
      >
        <Compass className="h-5 w-5 shrink-0 text-blue-400" aria-hidden />
        <span>Discover</span>
      </Link>
      <div className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
        Subscriptions
      </div>
      {channels.length === 0 ? (
        <p className="px-3 text-xs text-muted">
          No subscriptions yet, or the list is empty.
        </p>
      ) : (
        <nav className="space-y-1">
          {channels.map((ch) => {
            const active =
              !suppressActiveChannel && ch.id === activeChannelId;
            return (
              <Link
                key={ch.id}
                href={`/dashboard?channel=${encodeURIComponent(ch.id)}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600/15 outline outline-1 outline-blue-500/40"
                    : "hover:bg-zinc-900"
                }`}
              >
                {ch.thumbnailUrl ? (
                  <Image
                    src={ch.thumbnailUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="h-8 w-8 shrink-0 rounded-full bg-raised"
                    aria-hidden
                  />
                )}
                <span className="truncate">{ch.title}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </aside>
  );
}
