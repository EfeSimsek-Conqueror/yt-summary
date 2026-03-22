/// <reference types="youtube" />

let loadPromise: Promise<void> | null = null;

/**
 * Load the YouTube IFrame API once and resolve when YT.Player is available.
 */
export function ensureYoutubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const w = window as Window & {
    YT?: { Player: typeof YT.Player };
    onYouTubeIframeAPIReady?: () => void;
  };

  if (w.YT?.Player) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.body.appendChild(tag);
    } else {
      const iv = window.setInterval(() => {
        if (w.YT?.Player) {
          window.clearInterval(iv);
          resolve();
        }
      }, 50);
      window.setTimeout(() => window.clearInterval(iv), 8000);
    }
  });

  return loadPromise;
}
