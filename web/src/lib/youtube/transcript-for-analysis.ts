import type { TranscriptResponse } from "youtube-transcript";

/**
 * youtube-transcript mixes caption XML formats: some use ms (srv3), others seconds.
 * Heuristic: chunk duration > 60 → offset/duration are in milliseconds.
 */
export function captionStartSeconds(offset: number, duration: number): number {
  const useMs = duration > 60;
  return useMs ? offset / 1000 : offset;
}

export function buildTimedTranscriptForModel(
  items: TranscriptResponse[],
): string {
  return items
    .map((item) => {
      const t = captionStartSeconds(item.offset, item.duration);
      return `[t=${t.toFixed(2)}s] ${item.text}`;
    })
    .join("\n");
}

export function buildPlainTranscript(items: TranscriptResponse[]): string {
  return items.map((i) => i.text).join(" ");
}

/** Last caption end time in seconds (for billing when video duration is unknown). */
export function estimateDurationSecondsFromTranscriptItems(
  items: TranscriptResponse[],
): number | null {
  if (!items.length) return null;
  let maxEnd = 0;
  for (const item of items) {
    const useMs = item.duration > 60;
    const startSec = captionStartSeconds(item.offset, item.duration);
    const durSec = useMs ? item.duration / 1000 : item.duration;
    const end = startSec + durSec;
    if (Number.isFinite(end) && end > maxEnd) maxEnd = end;
  }
  return maxEnd > 0 ? Math.max(1, Math.ceil(maxEnd)) : null;
}
