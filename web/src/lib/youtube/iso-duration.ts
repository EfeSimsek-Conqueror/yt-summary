/**
 * Parse YouTube contentDetails.duration (ISO 8601, e.g. PT8M42S, PT1H2M3S).
 */
export function parseIso8601DurationToSeconds(iso: string): number | null {
  const m = iso.match(
    /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/,
  );
  if (!m) return null;
  const h = parseInt(m[1] ?? "0", 10) || 0;
  const min = parseInt(m[2] ?? "0", 10) || 0;
  const s = parseInt(m[3] ?? "0", 10) || 0;
  return h * 3600 + min * 60 + s;
}

/**
 * Parse UI duration labels like "5:00", "13:01", or "1:05:30" to seconds.
 */
export function parseDurationLabelToSeconds(label: string): number | null {
  const t = label.trim();
  if (!t) return null;
  const parts = t.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

export function formatDurationLabel(isoOrSeconds: string | number): string {
  const sec =
    typeof isoOrSeconds === "number"
      ? isoOrSeconds
      : parseIso8601DurationToSeconds(isoOrSeconds);
  if (sec === null || Number.isNaN(sec)) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
