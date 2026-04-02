"use client";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  getAvatarUrlFromUser,
  getInitialsFromUser,
} from "@/lib/auth/google-avatar";
import { useEffect, useState } from "react";

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

export type GoogleAccountAvatarSize = "sm" | "md" | "lg";

const SIZE: Record<
  GoogleAccountAvatarSize,
  { px: number; box: string; text: string; round: string; ring: string }
> = {
  sm: {
    px: 32,
    box: "h-8 w-8",
    text: "text-xs",
    round: "rounded-full",
    ring: "ring-2 ring-gray-800",
  },
  md: {
    px: 36,
    box: "h-9 w-9",
    text: "text-sm",
    round: "rounded-full",
    ring: "ring-2 ring-gray-800",
  },
  lg: {
    px: 80,
    box: "h-20 w-20",
    text: "text-2xl font-bold",
    round: "rounded-2xl",
    ring: "ring-2 ring-gray-800 shadow-lg shadow-purple-500/30",
  },
};

type Props = {
  user: User;
  size?: GoogleAccountAvatarSize;
  className?: string;
};

/**
 * Google profile photo when available (JWT metadata, userinfo, or /api/auth/google-picture).
 * Falls back to initials on the same gradient as the rest of VidSum.
 */
export function GoogleAccountAvatar({ user, size = "md", className = "" }: Props) {
  const metaUrl = getAvatarUrlFromUser(user);
  const [googleApiUrl, setGoogleApiUrl] = useState<string | null>(null);
  const url = metaUrl ?? googleApiUrl;
  const [imgFailed, setImgFailed] = useState(false);
  const s = SIZE[size];

  useEffect(() => {
    setImgFailed(false);
  }, [url]);

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
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={s.px}
        height={s.px}
        className={`${s.box} shrink-0 ${s.round} object-cover ${s.ring} ${className}`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`flex ${s.box} shrink-0 items-center justify-center ${s.round} bg-gradient-to-br from-blue-500 to-purple-600 ${s.text} text-white ${s.ring} ${className}`}
      aria-hidden
    >
      {getInitialsFromUser(user)}
    </div>
  );
}
