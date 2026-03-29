export type CaptionTrackJson = {
  languageCode?: string;
  baseUrl?: string;
};

export function pickBestBaseUrl(tracks: CaptionTrackJson[]): string | null {
  if (!tracks.length) return null;
  const en = tracks.find(
    (t) =>
      t.languageCode === "en" ||
      t.languageCode?.startsWith("en") ||
      t.languageCode === "en-US",
  );
  const url = (en ?? tracks[0])?.baseUrl;
  return typeof url === "string" && url.length > 0 ? url : null;
}

/** Ordered list for trying timedtext (en first, then rest). */
export function orderCaptionTracksForFetch(
  tracks: CaptionTrackJson[],
): CaptionTrackJson[] {
  const out: CaptionTrackJson[] = [];
  const seen = new Set<string>();
  const push = (t: CaptionTrackJson | undefined) => {
    if (t?.baseUrl && !seen.has(t.baseUrl)) {
      seen.add(t.baseUrl);
      out.push(t);
    }
  };
  push(tracks.find((t) => t.languageCode === "en"));
  push(tracks.find((t) => t.languageCode?.startsWith("en")));
  push(tracks.find((t) => t.languageCode === "en-US"));
  for (const t of tracks) push(t);
  return out;
}
