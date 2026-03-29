import type { TranscriptResponse } from "youtube-transcript";
import type { CaptionTrackJson } from "@/lib/youtube/caption-tracks-shared";
import { orderCaptionTracksForFetch } from "@/lib/youtube/caption-tracks-shared";
import { parseYoutubeVideoId } from "@/lib/youtube/video-id";
import {
  captionUrlWithFmt,
  parseTimedtextJson3,
  parseTimedtextSrv3OrClassic,
} from "@/lib/youtube/timedtext-parse";
import { youtubeLikeFetch } from "@/lib/youtube/youtube-transcript-fetch";

export type { CaptionTrackJson } from "@/lib/youtube/caption-tracks-shared";
export {
  pickBestBaseUrl,
  orderCaptionTracksForFetch,
} from "@/lib/youtube/caption-tracks-shared";

/**
 * Same InnerTube player POST as `youtube-transcript` (ANDROID), but we pick a caption
 * track without that package’s `lang` strict match — avoids bogus “not available in es”.
 */
const PLAYER_URL =
  "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const ANDROID_VER = "20.10.38";
const ANDROID_UA = `com.google.android.youtube/${ANDROID_VER} (Linux; U; Android 14)`;

const playerContext = {
  client: {
    clientName: "ANDROID",
    clientVersion: ANDROID_VER,
  },
};

function parseYtInitialCaptions(html: string): CaptionTrackJson[] | null {
  const marker = "var ytInitialPlayerResponse = ";
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  let depth = 0;
  const start = idx + marker.length;
  for (let i = start; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          const json = JSON.parse(html.slice(start, i + 1)) as {
            captions?: {
              playerCaptionsTracklistRenderer?: {
                captionTracks?: CaptionTrackJson[];
              };
            };
          };
          const t =
            json.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          return Array.isArray(t) ? t : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

async function fetchRowsFromBaseUrl(
  baseUrl: string,
  langLabel: string,
): Promise<TranscriptResponse[]> {
  for (const fmt of ["srv3", "json3"] as const) {
    const url = captionUrlWithFmt(baseUrl, fmt);
    const res = await youtubeLikeFetch(url, { headers: { Accept: "*/*" } });
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

/**
 * Caption track list only (no timedtext). Used by `/api/youtube/caption-tracks` so the
 * browser can fetch timedtext with the user’s network path (often avoids server-only blocks).
 */
export async function getCaptionTracksForVideo(
  videoIdRaw: string,
): Promise<CaptionTrackJson[]> {
  const id = parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw.trim();
  if (!/^[\w-]{11}$/.test(id)) {
    return [];
  }

  try {
    const res = await youtubeLikeFetch(PLAYER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": ANDROID_UA,
      },
      body: JSON.stringify({ context: playerContext, videoId: id }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        captions?: {
          playerCaptionsTracklistRenderer?: {
            captionTracks?: CaptionTrackJson[];
          };
        };
      };
      const tracks =
        data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(tracks) && tracks.length > 0) {
        return tracks;
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const htmlRes = await youtubeLikeFetch(
      `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
    );
    if (!htmlRes.ok) return [];
    const html = await htmlRes.text();
    if (html.includes('class="g-recaptcha"')) return [];
    const tracks = parseYtInitialCaptions(html);
    return tracks ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch transcript using YouTube player JSON + timedtext — **does not** use the
 * `youtube-transcript` npm package (no `lang` foot-gun).
 */
export async function fetchTranscriptViaPlayerApi(
  videoIdRaw: string,
): Promise<TranscriptResponse[]> {
  const id = parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw.trim();
  if (!/^[\w-]{11}$/.test(id)) {
    return [];
  }

  const tracks = await getCaptionTracksForVideo(videoIdRaw);
  if (!tracks.length) return [];

  const ordered = orderCaptionTracksForFetch(tracks);
  for (const t of ordered.slice(0, 8)) {
    const baseUrl = t.baseUrl;
    if (!baseUrl) continue;
    const lang = t.languageCode ?? "en";
    const rows = await fetchRowsFromBaseUrl(baseUrl, lang);
    if (rows.length > 0) {
      console.warn(
        "[video-analysis] transcript: player API (no youtube-transcript pkg)",
        id,
      );
      return rows;
    }
  }

  return [];
}
