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
