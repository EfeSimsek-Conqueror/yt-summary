const MINUTE = 60;
const HOUR = 3_600;
const DAY = 86_400;
const WEEK = 604_800;
const MONTH = 2_592_000;
const YEAR = 31_536_000;

/**
 * "2 days ago", "3 months ago", etc.
 * Falls back to locale date string for very old dates or invalid input.
 */
export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSec < 0) return date.toLocaleDateString();
  if (diffSec < MINUTE) return "just now";

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (diffSec < HOUR) return rtf.format(-Math.floor(diffSec / MINUTE), "minute");
  if (diffSec < DAY) return rtf.format(-Math.floor(diffSec / HOUR), "hour");
  if (diffSec < WEEK) return rtf.format(-Math.floor(diffSec / DAY), "day");
  if (diffSec < MONTH) return rtf.format(-Math.floor(diffSec / WEEK), "week");
  if (diffSec < YEAR) return rtf.format(-Math.floor(diffSec / MONTH), "month");
  return rtf.format(-Math.floor(diffSec / YEAR), "year");
}
