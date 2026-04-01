"use client";

import { useEffect, useRef, useState } from "react";
import { loadYoutubeIframeApi } from "@/lib/landing/youtube-iframe-api";

type Props = {
  youtubeId: string;
  onPlayingChange?: (playing: boolean) => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
};

/**
 * YouTube IFrame API replaces the host element’s contents. Mounting the player
 * on a node appended to document.body avoids React removeChild conflicts when
 * tracks change or the component unmounts.
 */
export function LandingPlayer({
  youtubeId,
  onPlayingChange,
  canGoPrev = false,
  canGoNext = false,
  onPrev,
  onNext,
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef<{
    destroy?: () => void;
    playVideo?: () => void;
    pauseVideo?: () => void;
  } | null>(null);
  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;
  /** Only accept PLAYING state after the user taps play (blocks stray YouTube autoplay). */
  const userStartedPlaybackRef = useRef(false);

  useEffect(() => {
    userStartedPlaybackRef.current = false;
    setIsReady(false);

    const mount = document.createElement("div");
    mount.setAttribute("aria-hidden", "true");
    mount.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
    document.body.appendChild(mount);

    let cancelled = false;
    (async () => {
      await loadYoutubeIframeApi();
      if (cancelled) return;
      const YT = (
        window as unknown as {
          YT: {
            Player: new (
              host: HTMLElement | string,
              opts: {
                height: string;
                width: string;
                videoId: string;
                playerVars: Record<string, string | number>;
                events: {
                  onReady: () => void;
                  onStateChange: (event: { data: number }) => void;
                  onError?: (event: { data: number }) => void;
                };
              },
            ) => {
              destroy?: () => void;
              playVideo?: () => void;
              pauseVideo?: () => void;
            };
          };
        }
      ).YT;
      if (!YT?.Player || cancelled) return;
      playerRef.current = new YT.Player(mount, {
        height: "0",
        width: "0",
        videoId: youtubeId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setIsReady(true);
            queueMicrotask(() => {
              try {
                playerRef.current?.pauseVideo?.();
              } catch {
                /* ignore */
              }
            });
          },
          onStateChange: (event: { data: number }) => {
            const playing = event.data === 1;
            if (playing && !userStartedPlaybackRef.current) {
              try {
                playerRef.current?.pauseVideo?.();
              } catch {
                /* ignore */
              }
              setIsPlaying(false);
              onPlayingChangeRef.current?.(false);
              return;
            }
            setIsPlaying(playing);
            onPlayingChangeRef.current?.(playing);
          },
          onError: () => {
            if (cancelled) return;
            setIsReady(true);
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      const p = playerRef.current;
      playerRef.current = null;
      try {
        p?.destroy?.();
      } catch {
        /* ignore */
      }
      mount.remove();
    };
  }, [youtubeId]);

  const handleTogglePlay = () => {
    if (!isReady || !playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo?.();
      } else {
        userStartedPlaybackRef.current = true;
        playerRef.current.playVideo?.();
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div className="relative z-[100] flex flex-col items-center gap-6">
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => onPrev?.()}
            disabled={!canGoPrev || !onPrev}
            className="flex h-12 w-12 items-center justify-center text-white/80 transition hover:scale-110 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Previous track"
          >
            <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={!isReady}
            className={`group relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-2xl transition hover:scale-105 active:scale-95 ${
              !isReady ? "cursor-not-allowed opacity-50" : ""
            }`}
            style={{
              boxShadow:
                "0 12px 40px rgba(255,255,255,0.25), 0 4px 16px rgba(0,0,0,0.15)",
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {!isReady ? (
              <svg
                className="h-8 w-8 animate-spin text-black"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : !isPlaying ? (
              <svg
                className="ml-1 h-8 w-8 text-black"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg className="h-8 w-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNext?.()}
            disabled={!canGoNext || !onNext}
            className="flex h-12 w-12 items-center justify-center text-white/80 transition hover:scale-110 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Next track"
          >
            <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        <p className="relative z-[100] text-sm font-light tracking-wide text-gray-400">
          {!isReady ? "Loading…" : isPlaying ? "Now playing" : "Tap play to listen"}
        </p>
      </div>
    </>
  );
}
