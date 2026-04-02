"use client";

import { GuestGateProvider } from "./guest-gate-context";
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
  /** Highlights Discover vs home subscriptions in the sidebar. */
  sidebarActiveView?: "dashboard" | "discover";
  /**
   * "hidden" = main column does not scroll; children control overflow (e.g. Discover).
   * Default "auto" = standard scrolling main area.
   */
  mainOverflow?: "auto" | "hidden";
  children: React.ReactNode;
};

export function AppShell({
  channels,
  activeChannelId,
  suppressSidebarActive = false,
  isAuthenticated = true,
  subscriptionSidebar = true,
  sidebarActiveView = "dashboard",
  mainOverflow = "auto",
  children,
}: Props) {
  const showGuestGate = !isAuthenticated;

  return (
    <GuestGateProvider value={showGuestGate}>
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-black text-white">
        {!showGuestGate ? <TopNav /> : null}
        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-x-hidden">
          <div
            className={
              showGuestGate
                ? "flex min-h-0 min-w-0 flex-1 blur-md saturate-50 pointer-events-none select-none"
                : "flex min-h-0 min-w-0 flex-1"
            }
            aria-hidden={showGuestGate}
          >
            {subscriptionSidebar ? (
              <SubscriptionSidebar
                channels={channels}
                activeChannelId={activeChannelId}
                suppressActiveChannel={suppressSidebarActive}
                sidebarActiveView={sidebarActiveView}
              />
            ) : null}
            <div
              className={
                mainOverflow === "hidden"
                  ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overflow-x-hidden"
                  : "min-h-0 min-w-0 flex-1 overflow-auto overflow-x-hidden"
              }
            >
              {children}
            </div>
          </div>
          {showGuestGate ? <GuestLoginOverlay /> : null}
        </div>
      </div>
    </GuestGateProvider>
  );
}
