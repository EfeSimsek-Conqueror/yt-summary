"use client";

import { GoogleAccountAvatar } from "@/components/google-account-avatar";
import { formatCreditsDisplay } from "@/lib/billing/video-credits";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import type { User } from "@supabase/supabase-js";
import {
  ChevronDown,
  CreditCard,
  LogOut,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Props = {
  user: User;
  onSignOut: () => void | Promise<void>;
};

export function UserProfileMenu({ user, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [planId, setPlanId] = useState<PlanId>("scout");
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(
    null,
  );
  const plan = PLANS[planId];
  const creditsLabel =
    creditsRemaining === null
      ? "Loading credits…"
      : plan.creditsPeriod === "once"
        ? `${formatCreditsDisplay(creditsRemaining)} credits to use`
        : `${formatCreditsDisplay(creditsRemaining)} credits left this month`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/credits", { credentials: "include" });
        if (!res.ok) return;
        const j = (await res.json()) as {
          creditsRemaining?: number;
          planId?: PlanId;
        };
        if (cancelled) return;
        if (typeof j.creditsRemaining === "number") {
          setCreditsRemaining(j.creditsRemaining);
        }
        if (j.planId === "navigator" || j.planId === "captain" || j.planId === "scout") {
          setPlanId(j.planId);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    function onCreditsUpdated(e: Event) {
      const ce = e as CustomEvent<{ remaining: number; planId?: PlanId }>;
      if (typeof ce.detail?.remaining === "number") {
        setCreditsRemaining(ce.detail.remaining);
      }
      if (
        ce.detail?.planId === "navigator" ||
        ce.detail?.planId === "captain" ||
        ce.detail?.planId === "scout"
      ) {
        setPlanId(ce.detail.planId);
      }
    }
    window.addEventListener("vidsum-credits-updated", onCreditsUpdated);
    return () =>
      window.removeEventListener("vidsum-credits-updated", onCreditsUpdated);
  }, []);

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
        <GoogleAccountAvatar user={user} size="md" />
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
              <GoogleAccountAvatar user={user} size="sm" />
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
              Plan & billing
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
