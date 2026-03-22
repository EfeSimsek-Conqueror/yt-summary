import { TopNav } from "./top-nav";
import { SubscriptionSidebar } from "./subscription-sidebar";
import type { Channel } from "@/lib/types";

type Props = {
  channels: Channel[];
  activeChannelId: string;
  suppressSidebarActive?: boolean;
  children: React.ReactNode;
};

export function AppShell({
  channels,
  activeChannelId,
  suppressSidebarActive = false,
  children,
}: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <TopNav />
      <div className="flex min-h-0 flex-1">
        <SubscriptionSidebar
          channels={channels}
          activeChannelId={activeChannelId}
          suppressActiveChannel={suppressSidebarActive}
        />
        <div className="min-w-0 flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
