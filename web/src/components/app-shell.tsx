import { GuestLoginOverlay } from "./guest-login-overlay";
import { TopNav } from "./top-nav";
import { SubscriptionSidebar } from "./subscription-sidebar";
import type { Channel } from "@/lib/types";

type Props = {
  channels: Channel[];
  activeChannelId: string;
  suppressSidebarActive?: boolean;
  /** When false, sidebar + main are blurred and a centered login prompt is shown. */
  isAuthenticated?: boolean;
  /** When false, the subscriptions column is hidden (e.g. video page with its own layout). */
  subscriptionSidebar?: boolean;
  children: React.ReactNode;
};

export function AppShell({
  channels,
  activeChannelId,
  suppressSidebarActive = false,
  isAuthenticated = true,
  subscriptionSidebar = true,
  children,
}: Props) {
  const showGuestGate = !isAuthenticated;

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <TopNav />
      <div className="relative flex min-h-0 flex-1">
        <div
          className={
            showGuestGate
              ? "flex min-h-0 flex-1 blur-md saturate-50 pointer-events-none select-none"
              : "flex min-h-0 flex-1"
          }
          aria-hidden={showGuestGate}
        >
          {subscriptionSidebar ? (
            <SubscriptionSidebar
              channels={channels}
              activeChannelId={activeChannelId}
              suppressActiveChannel={suppressSidebarActive}
            />
          ) : null}
          <div className="min-w-0 flex-1 overflow-auto">{children}</div>
        </div>
        {showGuestGate ? <GuestLoginOverlay /> : null}
      </div>
    </div>
  );
}
