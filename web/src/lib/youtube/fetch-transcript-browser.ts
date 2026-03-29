import type { TranscriptResponse } from "youtube-transcript";
import {
  captionUrlWithFmt,
  parseTimedtextJson3,
  parseTimedtextSrv3OrClassic,
} from "@/lib/youtube/timedtext-parse";
import type { CaptionTrackJson } from "@/lib/youtube/caption-tracks-shared";
import { orderCaptionTracksForFetch } from "@/lib/youtube/caption-tracks-shared";

/**
 * Fetch timedtext from the **browser** (user IP / session context). YouTube often allows
 * this origin for `timedtext` GET; if CORS blocks, returns [].
 */
export async function fetchTimedtextRowsInBrowser(
  baseUrl: string,
  langLabel: string,
): Promise<TranscriptResponse[]> {
  for (const fmt of ["srv3", "json3"] as const) {
    const url = captionUrlWithFmt(baseUrl, fmt);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        headers: { Accept: "*/*" },
      });
    } catch {
      return [];
    }
    if (!res.ok) continue;
    const body = await res.text();
    if (!body || body.length < 2) continue;
    const rows =
      fmt === "srv3"
        ? parseTimedtextSrv3OrClassic(body, langLabel)
        : parseTimedtextJson3(body, langLabel);
    if (rows.length > 0) return rows;
  }
  return [];
}

/** Try each track until one returns rows (same order as server preference). */
export async function fetchTranscriptFromCaptionTracksInBrowser(
  tracks: CaptionTrackJson[],
): Promise<TranscriptResponse[]> {
  const ordered = orderCaptionTracksForFetch(tracks);
  for (const t of ordered.slice(0, 8)) {
    const baseUrl = t.baseUrl;
    if (!baseUrl) continue;
    const lang = t.languageCode ?? "en";
    const rows = await fetchTimedtextRowsInBrowser(baseUrl, lang);
    if (rows.length > 0) return rows;
  }
  return [];
}
