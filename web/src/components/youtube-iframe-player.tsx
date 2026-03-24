"use client";

/// <reference types="youtube" />

import { memo, useLayoutEffect, useRef } from "react";
import { ensureYoutubeIframeApi } from "@/lib/youtube/iframe-api";

const PLAYER_ON_READY_MS = 45_000;

type Props = {
  videoId: string;
  retryKey: number;
  onReady: (player: YT.Player) => void;
  onTimeout: () => void;
  onError: () => void;
};

/**
 * Isolated from the rest of the page so analysis/state re-renders do not
 * reconcile React’s DOM against YouTube’s iframe (fixes removeChild crashes).
 * Mount node is created imperatively and removed in layout cleanup.
 */
function YoutubeIframePlayerInner({
  videoId,
  retryKey,
  onReady,
  onTimeout,
  onError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const onTimeoutRef = useRef(onTimeout);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onTimeoutRef.current = onTimeout;
  onErrorRef.current = onError;

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const mount = document.createElement("div");
    mount.style.width = "100%";
    mount.style.height = "100%";
    root.appendChild(mount);

    let cancelled = false;
    let ytPlayer: YT.Player | null = null;
    let onReadyTimeoutId: ReturnType<typeof setTimeout> | undefined;

    void ensureYoutubeIframeApi()
      .then(() => {
        if (cancelled || !root.contains(mount)) return;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (cancelled || !root.contains(mount)) return;
            onReadyTimeoutId = setTimeout(() => {
              if (!cancelled) {
                onTimeoutRef.current();
              }
            }, PLAYER_ON_READY_MS);

            ytPlayer = new YT.Player(mount, {
              videoId,
              width: "100%",
              height: "100%",
              playerVars: {
                enablejsapi: 1,
                origin:
                  typeof window !== "undefined"
                    ? window.location.origin
                    : undefined,
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
              },
              events: {
                onReady: (e) => {
                  if (cancelled) return;
                  if (onReadyTimeoutId !== undefined) {
                    clearTimeout(onReadyTimeoutId);
                    onReadyTimeoutId = undefined;
                  }
                  onReadyRef.current(e.target);
                },
                onError: () => {
                  if (cancelled) return;
                  if (onReadyTimeoutId !== undefined) {
                    clearTimeout(onReadyTimeoutId);
                    onReadyTimeoutId = undefined;
                  }
                  onErrorRef.current();
                },
              },
            });
          });
        });
      })
      .catch(() => {
        if (!cancelled) {
          onErrorRef.current();
        }
      });

    return () => {
      cancelled = true;
      if (onReadyTimeoutId !== undefined) {
        clearTimeout(onReadyTimeoutId);
      }
      try {
        ytPlayer?.destroy();
      } catch {
        /* ignore */
      }
      ytPlayer = null;
      mount.remove();
    };
  }, [videoId, retryKey]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}

export const YoutubeIframePlayer = memo(
  YoutubeIframePlayerInner,
  (prev, next) =>
    prev.videoId === next.videoId && prev.retryKey === next.retryKey,
);
