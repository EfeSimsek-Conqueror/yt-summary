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
