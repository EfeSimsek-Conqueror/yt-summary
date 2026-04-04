"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UserPreferences = {
  analysis_language: string;
  auto_analyze: boolean;
  spoiler_protection: boolean;
  default_summary_view: "short" | "detailed";
};

const DEFAULTS: UserPreferences = {
  analysis_language: "en",
  auto_analyze: true,
  spoiler_protection: true,
  default_summary_view: "detailed",
};

let cachedPrefs: UserPreferences | null = null;
let inflight: Promise<UserPreferences> | null = null;

async function fetchPrefs(): Promise<UserPreferences> {
  try {
    const res = await fetch("/api/me/preferences", { credentials: "include" });
    if (!res.ok) return DEFAULTS;
    const data = (await res.json()) as Partial<UserPreferences>;
    return { ...DEFAULTS, ...data };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Shared hook: fetches preferences once and caches in module scope.
 * Multiple components calling this share the same request.
 */
export function useUserPreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(cachedPrefs ?? DEFAULTS);
  const [loading, setLoading] = useState(!cachedPrefs);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (cachedPrefs) {
      setPrefs(cachedPrefs);
      setLoading(false);
      return;
    }
    if (!inflight) {
      inflight = fetchPrefs().then((p) => {
        cachedPrefs = p;
        inflight = null;
        return p;
      });
    }
    void inflight.then((p) => {
      if (mounted.current) {
        setPrefs(p);
        setLoading(false);
      }
    });
    return () => {
      mounted.current = false;
    };
  }, []);

  const update = useCallback(
    async (patch: Partial<UserPreferences>) => {
      const optimistic = { ...prefs, ...patch };
      setPrefs(optimistic);
      cachedPrefs = optimistic;
      try {
        const res = await fetch("/api/me/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          const saved = (await res.json()) as Partial<UserPreferences>;
          const merged = { ...DEFAULTS, ...saved };
          cachedPrefs = merged;
          if (mounted.current) setPrefs(merged);
        }
      } catch {
        /* keep optimistic value */
      }
    },
    [prefs],
  );

  const invalidate = useCallback(() => {
    cachedPrefs = null;
    inflight = null;
  }, []);

  return { prefs, loading, update, invalidate };
}
