import type { CaptionTrackJson } from "@/lib/youtube/caption-tracks-shared";
import { fetchTranscriptFromCaptionTracksInBrowser } from "@/lib/youtube/fetch-transcript-browser";
import { buildPlainTranscript } from "@/lib/youtube/transcript-for-analysis";

const MIN_PLAIN_CHARS = 400;

/** After `/api/ai/video-analysis` fails on captions, try browser timedtext + same min length as paste. */
export function shouldRetryVideoAnalysisWithBrowserTranscript(
  status: number,
  message: string,
): boolean {
  if (status === 429) return true;
  if (status !== 422) return false;
  const e = message.toLowerCase();
  return (
    e.includes("no captions") ||
    e.includes("could not load captions") ||
    e.includes("did not expose captions") ||
    e.includes("transcript text") ||
    e.includes("captions were empty") ||
    e.includes("empty — try")
  );
}

/**
 * GET `/api/youtube/caption-tracks` then fetch timedtext in the browser (user IP / CORS).
 * Returns plain text for `transcriptPlain` or null.
 */
export async function tryPlainTranscriptFromBrowserCaptionFetch(
  videoId: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const r = await fetch(
    `/api/youtube/caption-tracks?videoId=${encodeURIComponent(videoId)}`,
    { signal, credentials: "same-origin" },
  );
  if (!r.ok) return null;
  const data = (await r.json()) as { tracks?: CaptionTrackJson[] };
  const tracks = data.tracks;
  if (!Array.isArray(tracks) || tracks.length === 0) return null;

  const rows = await fetchTranscriptFromCaptionTracksInBrowser(tracks);
  if (rows.length === 0) return null;

  const plain = buildPlainTranscript(rows);
  if (plain.length < MIN_PLAIN_CHARS) return null;

  console.warn("[video-analysis] transcript: browser timedtext ok", videoId);
  return plain;
}
