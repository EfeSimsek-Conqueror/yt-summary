"use client";

import { formatCreditsDisplay } from "@/lib/billing/video-credits";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import type { User } from "@supabase/supabase-js";
import {
  ChevronDown,
  CreditCard,
  LogOut,
  Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo";

async function fetchPictureWithProviderToken(
  signal: AbortSignal,
): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.provider_token;
  if (!token) return null;
  try {
    const r = await fetch(GOOGLE_USERINFO, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { picture?: string };
    return typeof j.picture === "string" && j.picture.trim().length > 0
      ? j.picture.trim()
      : null;
  } catch {
    return null;
  }
}

async function fetchPictureViaApiRoute(
  signal: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/google-picture", {
      credentials: "include",
      signal,
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { picture: string | null };
    return typeof j.picture === "string" && j.picture.trim().length > 0
      ? j.picture.trim()
      : null;
  } catch {
    return null;
  }
}

type Props = {
  user: User;
  onSignOut: () => void | Promise<void>;
};

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

/** Last resort: any metadata URL that looks like a Google / profile image. */
function scanMetadataForProfileImage(
  obj: Record<string, unknown> | null | undefined,
): string | null {
  if (!obj || typeof obj !== "object") return null;
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val !== "string" || val.length < 12) continue;
    const v = val.trim();
    if (!v.startsWith("http")) continue;
    if (/picture|avatar|photo|image|thumb|profile/i.test(key)) return v;
    if (v.includes("googleusercontent.com") || v.includes("ggpht.com")) return v;
  }
  return null;
}

/**
 * Google OIDC puts the profile photo in `picture` (OpenID standard).
 * Supabase may also copy it to `avatar_url`. Identity rows keep the same keys.
 */
function getAvatarUrl(user: User): string | null {
  const m = user.user_metadata;
  if (m && typeof m === "object") {
    const rec = m as Record<string, unknown>;
    const fromMeta = [rec.picture, rec.avatar_url];
    for (const u of fromMeta) {
      if (typeof u === "string" && u.trim().length > 0) return u.trim();
    }
    const scanned = scanMetadataForProfileImage(rec);
    if (scanned) return scanned;
  }
  for (const id of user.identities ?? []) {
    const d = id.identity_data;
    if (!d || typeof d !== "object") continue;
    const idRec = d as Record<string, unknown>;
    const fromId = [idRec.picture, idRec.avatar_url];
    for (const u of fromId) {
      if (typeof u === "string" && u.trim().length > 0) return u.trim();
    }
    const scanned = scanMetadataForProfileImage(idRec);
    if (scanned) return scanned;
  }
  return null;
}

function UserAvatar({ user, size = "md" }: { user: User; size?: "sm" | "md" }) {
  const metaUrl = getAvatarUrl(user);
  const [googleApiUrl, setGoogleApiUrl] = useState<string | null>(null);
  const url = metaUrl ?? googleApiUrl;
  const px = size === "sm" ? 32 : 36;
  const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [url]);

  /**
   * If JWT omits `picture`, resolve it from Google userinfo. Prefer the browser
   * session’s `provider_token` (often present only client-side); fall back to the
   * API route when SSR/cookies don’t expose the token.
   */
  useEffect(() => {
    setGoogleApiUrl(null);
    if (metaUrl) return;
    const ac = new AbortController();
    (async () => {
      let pic = await fetchPictureWithProviderToken(ac.signal);
      if (!pic && !ac.signal.aborted) {
        pic = await fetchPictureViaApiRoute(ac.signal);
      }
      if (pic && !ac.signal.aborted) setGoogleApiUrl(pic);
    })();
    return () => ac.abort();
  }, [user.id, metaUrl]);

  if (url && !imgFailed) {
    // Native <img>: Google profile URLs use various *.googleusercontent.com hosts;
    // avoids Next/Image remotePatterns missing a subdomain.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={px}
        height={px}
        className={`${dim} shrink-0 rounded-full object-cover ring-2 ring-gray-800`}
        onError={() => setImgFailed(true)}
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
