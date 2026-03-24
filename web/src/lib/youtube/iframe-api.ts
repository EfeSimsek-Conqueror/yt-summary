/// <reference types="youtube" />

let loadPromise: Promise<void> | null = null;

/**
 * Load the YouTube IFrame API once and resolve when `YT.Player` is available.
 * Never leaves the returned promise pending indefinitely (fixes stuck “Loading player…”).
 */
export function ensureYoutubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const w = window as Window & {
    YT?: { Player: typeof YT.Player };
    onYouTubeIframeAPIReady?: () => void;
  };

  if (w.YT?.Player) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    let settled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const done = (ok: boolean, err?: Error) => {
      if (settled) return;
      settled = true;
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      if (ok) {
        resolve();
      } else {
        loadPromise = null;
        reject(err ?? new Error("YouTube IFrame API unavailable"));
      }
    };

    const tryResolve = () => {
      if (w.YT?.Player) {
        done(true);
      }
    };

    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      tryResolve();
    };

    const scriptPresent = Boolean(
      document.querySelector('script[src*="youtube.com/iframe_api"]'),
    );

    if (!scriptPresent) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () =>
        done(false, new Error("YouTube iframe_api script failed to load"));
      document.body.appendChild(tag);
    }

    tryResolve();
    intervalId = setInterval(tryResolve, 50);

    const maxMs = 15_000;
    timeoutId = setTimeout(() => {
      if (w.YT?.Player) {
        done(true);
      } else {
        done(false, new Error("YouTube IFrame API load timeout"));
      }
    }, maxMs);
  });

  return loadPromise.catch((e) => {
    loadPromise = null;
    throw e;
  });
}
