/**
 * Heuristic 0–100 score: how "speech-dense" the transcript is vs video length.
 * Reference ~120 wpm → ~100. Sparse dialogue / long action scenes → low score.
 */
const REFERENCE_WPM = 120;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function transcriptDensityPercent(
  wordCount: number,
  durationSec: number,
): number | null {
  if (durationSec <= 0 || !Number.isFinite(durationSec)) {
    return null;
  }
  const minutes = durationSec / 60;
  if (minutes <= 0) return null;
  const wpm = wordCount / minutes;
  return Math.min(100, Math.round((wpm / REFERENCE_WPM) * 100));
}

/**
 * When duration is unknown: favor triggering visual for very short text only.
 */
export function transcriptDensityFallbackPercent(wordCount: number): number {
  if (wordCount < 40) return 25;
  if (wordCount < 120) return 45;
  if (wordCount < 400) return 62;
  return 78;
}
