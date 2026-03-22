import Image from "next/image";
import Link from "next/link";
import type { Channel } from "@/lib/types";

type Props = {
  channels: Channel[];
  activeChannelId: string;
  /** When true, no subscription row is highlighted (e.g. global search mode). */
  suppressActiveChannel?: boolean;
};

export function SubscriptionSidebar({
  channels,
  activeChannelId,
  suppressActiveChannel = false,
}: Props) {
  return (
    <aside
      className="w-[280px] shrink-0 border-r border-line bg-surface py-4 pl-3 pr-2"
      aria-label="Subscriptions"
    >
      <div className="px-3 pb-3 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
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
                href={`/?channel=${encodeURIComponent(ch.id)}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent/15 outline outline-1 outline-accent/35"
                    : "hover:bg-raised"
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
