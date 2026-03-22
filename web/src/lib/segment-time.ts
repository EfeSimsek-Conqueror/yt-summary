import type { Segment } from "@/lib/types";

/** Format seconds as MM:SS (for segment labels). */
export function formatSecondsAsMmSs(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** Parse "MM:SS", "HH:MM:SS", or "H:MM:SS" style labels to seconds. */
export function timestampLabelToSeconds(label: string): number | null {
  const parts = label
    .trim()
    .split(":")
    .map((x) => parseInt(x, 10));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export function segmentStartSeconds(seg: Segment): number | null {
  if (typeof seg.startSec === "number" && !Number.isNaN(seg.startSec)) {
    return seg.startSec;
  }
  return timestampLabelToSeconds(seg.startLabel);
}
