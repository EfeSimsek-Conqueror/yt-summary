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
  children: React.ReactNode;
};

export function AppShell({
  channels,
  activeChannelId,
  suppressSidebarActive = false,
  isAuthenticated = true,
  children,
}: Props) {
  const showGuestGate = !isAuthenticated;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
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
          <SubscriptionSidebar
            channels={channels}
            activeChannelId={activeChannelId}
            suppressActiveChannel={suppressSidebarActive}
          />
          <div className="min-w-0 flex-1 overflow-auto">{children}</div>
        </div>
        {showGuestGate ? <GuestLoginOverlay /> : null}
      </div>
    </div>
  );
}
