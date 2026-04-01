"use client";

import { useEffect, useState } from "react";

type Props = {
  youtubeId: string;
  /** Seconds — align with landing audio preview (chorus / drop). */
  startSeconds?: number;
  isPlaying: boolean;
  /**
   * Full browser viewport behind the hero (default). Use `inline` only for a small card-sized preview.
   */
  layout?: "fullscreen" | "inline";
};

/** Blurred, muted YouTube embed for atmosphere. Fullscreen covers the whole viewport when playing. */
export function LandingBackgroundVideo({
  youtubeId,
  startSeconds = 0,
  isPlaying,
  layout = "fullscreen",
}: Props) {
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setHasError(false);
    setRetryCount(0);
    setIsLoading(true);
  }, [youtubeId, startSeconds]);

  if (!isPlaying) return null;

  const shell =
    layout === "fullscreen"
      ? "pointer-events-none absolute inset-0 z-[2] min-h-[100dvh] w-full overflow-hidden"
      : "pointer-events-none absolute inset-0 z-0 overflow-hidden";

  return (
    <div className={shell} aria-hidden>
      {!hasError ? (
        <iframe
          key={`bg-${youtubeId}-${startSeconds}-${retryCount}`}
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&loop=1&playlist=${youtubeId}&iv_load_policy=3&fs=0&cc_load_policy=0&playsinline=1&disablekb=1&start=${startSeconds}&enablejsapi=1`}
          title="Background"
          className="border-0 outline-none"
          onError={() => {
            setIsLoading(false);
            if (retryCount < 2) {
              setRetryCount((c) => c + 1);
              setTimeout(() => setHasError(false), 1000);
            } else {
              setHasError(true);
            }
          }}
          onLoad={() => {
            setIsLoading(false);
            setHasError(false);
          }}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: layout === "fullscreen" ? "120vw" : "200%",
            height: layout === "fullscreen" ? "120vh" : "200%",
            minWidth: layout === "fullscreen" ? "100%" : undefined,
            minHeight: layout === "fullscreen" ? "100%" : undefined,
            transform: "translate(-50%, -50%)",
            filter:
              layout === "fullscreen"
                ? "blur(28px) brightness(0.4) contrast(1.15)"
                : "blur(20px) brightness(0.45) contrast(1.2)",
            opacity: isLoading ? 0.35 : layout === "fullscreen" ? 0.65 : 0.55,
            transition: "opacity 1s ease-in-out",
          }}
          allow="autoplay; encrypted-media"
        />
      ) : (
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              "linear-gradient(45deg, #000000 0%, #1a1a1a 50%, #000000 100%)",
          }}
        />
      )}
      <div className="absolute inset-0 bg-black/35" />
    </div>
  );
}
