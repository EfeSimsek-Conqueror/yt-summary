"use client";

import { PLANS, type PlanId } from "@/lib/billing/plans";
import type { User } from "@supabase/supabase-js";
import {
  ChevronDown,
  CreditCard,
  LogOut,
  Settings,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Props = {
  user: User;
  onSignOut: () => void | Promise<void>;
};

/** Until billing is wired to Supabase, show default Scout + full starter credits. */
function getPlanSnapshot(): { planId: PlanId; creditsRemaining: number } {
  return {
    planId: "scout",
    creditsRemaining: PLANS.scout.creditsIncluded,
  };
}

function getInitials(user: User): string {
  const name = user.user_metadata?.full_name;
  if (typeof name === "string" && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
    }
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  const e = user.email ?? "?";
  return e.slice(0, 2).toUpperCase();
}

function UserAvatar({ user, size = "md" }: { user: User; size?: "sm" | "md" }) {
  const url = user.user_metadata?.avatar_url;
  const px = size === "sm" ? 32 : 36;
  const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";
  if (typeof url === "string" && url.length > 0) {
    return (
      <Image
        src={url}
        alt=""
        width={px}
        height={px}
        className={`${dim} shrink-0 rounded-full object-cover ring-2 ring-gray-800`}
        unoptimized
      />
    );
  }
  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-semibold text-white ring-2 ring-gray-800`}
      aria-hidden
    >
      {getInitials(user)}
    </div>
  );
}

export function UserProfileMenu({ user, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { planId, creditsRemaining } = getPlanSnapshot();
  const plan = PLANS[planId];
  const creditsLabel =
    plan.creditsPeriod === "once"
      ? `${creditsRemaining} credits to use`
      : `${creditsRemaining} credits left this month`;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg border border-transparent py-1 pl-1 pr-2 transition hover:border-gray-700 hover:bg-zinc-900/80"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar user={user} />
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-[100] mt-2 w-[min(calc(100vw-2rem),280px)] overflow-hidden rounded-xl border border-gray-800 bg-zinc-950 shadow-2xl shadow-black/60"
          role="menu"
        >
          <div className="border-b border-gray-800 p-3">
            <div className="flex gap-3">
              <UserAvatar user={user} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {user.user_metadata?.full_name ?? "Signed in"}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {user.email ?? ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-md border border-purple-500/35 bg-purple-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-purple-200">
                    {plan.shortName}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-gray-400">{creditsLabel}</p>
              </div>
            </div>
          </div>

          <div className="py-1">
            <Link
              href="/settings"
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-200 transition hover:bg-zinc-900"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-4 w-4 shrink-0 text-gray-500" />
              Settings
            </Link>
            <Link
              href="/settings/billing"
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-200 transition hover:bg-zinc-900"
              onClick={() => setOpen(false)}
            >
              <CreditCard className="h-4 w-4 shrink-0 text-gray-500" />
              Billing & plan
            </Link>
          </div>

          <div className="border-t border-gray-800 p-1">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-gray-400 transition hover:bg-zinc-900 hover:text-white"
              onClick={() => {
                setOpen(false);
                void onSignOut();
              }}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
