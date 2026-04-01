"use client";

import { createContext, useContext } from "react";

const GuestGateContext = createContext(false);

export function GuestGateProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return (
    <GuestGateContext.Provider value={value}>
      {children}
    </GuestGateContext.Provider>
  );
}

/** True when the dashboard main area is gated behind the guest login overlay. */
export function useGuestGate() {
  return useContext(GuestGateContext);
}
