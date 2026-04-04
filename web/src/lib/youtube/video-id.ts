/** YouTube video IDs are 11 characters from [A-Za-z0-9_-]. */
export function isLikelyYoutubeVideoId(id: string): boolean {
  return /^[\w-]{11}$/.test(id);
}

/**
 * Normalizes a watch URL, youtu.be link, embed path, or raw 11-char id to the id.
 */
export function parseYoutubeVideoId(input: string): string | null {
  const t = input.trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  const patterns = [
    /[?&]v=([\w-]{11})\b/,
    /youtu\.be\/([\w-]{11})\b/,
    /youtube\.com\/embed\/([\w-]{11})\b/,
    /youtube\.com\/shorts\/([\w-]{11})\b/,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * Extract a YouTube playlist ID from various URL formats.
 * - youtube.com/playlist?list=PLxxx
 * - youtube.com/watch?v=xxx&list=PLxxx
 */
export function parsePlaylistId(input: string): string | null {
  const t = input.trim();
  const m = t.match(/[?&]list=([\w-]+)/);
  return m?.[1] ?? null;
}

/** Canonical watch URL for APIs (e.g. Supadata `url` query param). */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}
