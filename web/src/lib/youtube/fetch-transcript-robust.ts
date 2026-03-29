import { Innertube } from "youtubei.js";
import type { TranscriptResponse } from "youtube-transcript";
import {
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";
import { parseYoutubeVideoId } from "./video-id";
import {
  fetchTranscriptViaDeepgram,
  getDeepgramApiKey,
} from "./transcript-via-deepgram";
import { fetchTranscriptViaPlayerApi } from "./youtube-player-transcript";
import { youtubeLikeFetch } from "./youtube-transcript-fetch";

/** Reuse transcript for the same video to avoid repeat YouTube hits (rate limits). */
const TRANSCRIPT_CACHE_TTL_MS = 45 * 60 * 1000;
const TRANSCRIPT_CACHE_MAX = 150;
const transcriptCache = new Map<
  string,
  { rows: TranscriptResponse[]; expires: number }
>();
const transcriptInflight = new Map<string, Promise<TranscriptResponse[]>>();

function trimTranscriptCache() {
  while (transcriptCache.size > TRANSCRIPT_CACHE_MAX) {
    let oldest: string | undefined;
    let oldestExp = Infinity;
    for (const [k, v] of transcriptCache) {
      if (v.expires < oldestExp) {
        oldestExp = v.expires;
        oldest = k;
      }
    }
    if (oldest) transcriptCache.delete(oldest);
    else break;
  }
}

/** `youtube-transcript` is usually fast; cap so we never block the whole request forever. */
const FETCH_TRANSCRIPT_TIMEOUT_MS = 22_000;
/** Innertube: multiple `getInfo` clients + caption fetches (no `/get_transcript`). */
const INNERTUBE_CAPTION_TIMEOUT_MS = 120_000;
/** yt-dlp download + Deepgram prerecorded (no Innertube reset on timeout). */
const DEEPGRAM_FETCH_TIMEOUT_MS = 14 * 60 * 1000;

let innertubePromise: Promise<Innertube> | null = null;

/** Fewer `getInfo` rounds = less burst to YouTube per request (rate limits). */
const INNERTUBE_CAPTION_CLIENTS = [
  "WEB",
  "ANDROID",
  "WEB_EMBEDDED",
  "MWEB",
] as const;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Watch-page fetch hit reCAPTCHA / rate limit. Cool down and retry caption URLs only
 * (no HTML scrape — avoids repeating the trigger).
 */
async function recoverFromRateLimit(
  videoIdRaw: string,
  vid: string,
  original: YoutubeTranscriptTooManyRequestError,
): Promise<TranscriptResponse[]> {
  /** Short cooldowns only — long multi-minute retries made the UI sit at ~95% then fail. */
  const cooldownsMs = [2500, 5500];
  for (let i = 0; i < cooldownsMs.length; i++) {
    await delay(cooldownsMs[i]!);
    try {
      const rows = await withTimeout(
        fetchTranscriptViaYoutubei(videoIdRaw),
        INNERTUBE_CAPTION_TIMEOUT_MS,
        vid,
        true,
      );
      if (rows.length > 0) {
        console.warn(
          "[video-analysis] transcript: innertube ok after rate-limit cooldown",
          vid,
        );
        return rows;
      }
    } catch {
      /* try next cooldown */
    }
  }
  return [];
}

function getInnertube(): Promise<Innertube> {
  if (!innertubePromise) {
    /** Default Node `fetch` only — do not pass `youtubeLikeFetch` here; it could break
     *  non-`/player` InnerTube calls when UA was narrowed to 3 paths (regression vs early app). */
    innertubePromise = Innertube.create({
      lang: "en",
      location: "US",
    });
  }
  return innertubePromise;
}

/**
 * Caps wall-clock wait so `Promise.allSettled` never hangs if YouTube or Innertube stalls.
 * On timeout we clear the Innertube singleton when the timed promise was the youtubei path.
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  videoId: string,
  resetInnertubeOnTimeout: boolean,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      if (resetInnertubeOnTimeout) {
        innertubePromise = null;
      }
      reject(new YoutubeTranscriptNotAvailableError(videoId));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
}

/** srv3 `<p t= dur=` (ms) + legacy `<text start= dur=` (seconds). Matches youtube-transcript heuristics. */
function parseTimedtextXml(xml: string, lang: string): TranscriptResponse[] {
  const out: TranscriptResponse[] = [];
  const srv3 = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  for (; (m = srv3.exec(xml)) !== null; ) {
    const tMs = parseInt(m[1]!, 10);
    const dMs = parseInt(m[2]!, 10);
    let inner = m[3] ?? "";
    let text = "";
    const sre = /<s[^>]*>([^<]*)<\/s>/g;
    let sm: RegExpExecArray | null;
    for (; (sm = sre.exec(inner)) !== null; ) text += sm[1] ?? "";
    if (!text) text = inner.replace(/<[^>]+>/g, "");
    text = decodeEntities(text).trim();
    if (!text) continue;
    out.push({
      text,
      offset: tMs,
      duration: dMs,
      lang,
    });
  }
  if (out.length > 0) return out;
  const classic = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
  for (; (m = classic.exec(xml)) !== null; ) {
    const text = decodeEntities(m[3] ?? "").trim();
    if (!text) continue;
    out.push({
      text,
      offset: parseFloat(m[1]!),
      duration: parseFloat(m[2]!),
      lang,
    });
  }
  return out;
}

function captionUrlWithFmt(baseUrl: string, fmt: "srv3" | "json3"): string {
  try {
    const u = new URL(baseUrl);
    u.searchParams.set("fmt", fmt);
    return u.toString();
  } catch {
    const join = baseUrl.includes("?") ? "&" : "?";
    return baseUrl.includes("fmt=")
      ? baseUrl.replace(/fmt=[^&]*/, `fmt=${fmt}`)
      : `${baseUrl}${join}fmt=${fmt}`;
  }
}

/** YouTube timedtext JSON (`fmt=json3`): `events[].tStartMs` / `dDurationMs` + `segs[].utf8`. */
function parseTimedtextJson3(raw: string, lang: string): TranscriptResponse[] {
  let parsed: { events?: unknown[] };
  try {
    parsed = JSON.parse(raw) as { events?: unknown[] };
  } catch {
    return [];
  }
  const events = parsed.events;
  if (!Array.isArray(events)) return [];
  const out: TranscriptResponse[] = [];
  for (const ev of events) {
    if (!ev || typeof ev !== "object") continue;
    const o = ev as Record<string, unknown>;
    const tStartMs = typeof o.tStartMs === "number" ? o.tStartMs : 0;
    const dDurationMs = typeof o.dDurationMs === "number" ? o.dDurationMs : 0;
    const segs = o.segs;
    if (!Array.isArray(segs)) continue;
    let text = "";
    for (const s of segs) {
      if (s && typeof s === "object" && "utf8" in s) {
        const u = (s as { utf8?: unknown }).utf8;
        if (typeof u === "string") text += u;
      }
    }
    text = text.replace(/\u200b/g, "").trim();
    if (!text) continue;
    const durSec = dDurationMs > 0 ? dDurationMs / 1000 : 0.05;
    out.push({
      text,
      offset: tStartMs / 1000,
      duration: durSec,
      lang,
    });
  }
  return out;
}

type InnertubeCaptionTrack = {
  base_url?: string;
  language_code?: string;
};

async function fetchRowsFromInnertubeTracks(
  tracks: InnertubeCaptionTrack[],
): Promise<TranscriptResponse[]> {
  const ordered: InnertubeCaptionTrack[] = [];
  const seen = new Set<string>();
  const push = (t: InnertubeCaptionTrack | undefined) => {
    if (t?.base_url && !seen.has(t.base_url)) {
      seen.add(t.base_url);
      ordered.push(t);
    }
  };
  push(tracks.find((t) => t.language_code === "en"));
  push(tracks.find((t) => t.language_code?.startsWith("en")));
  push(tracks.find((t) => t.language_code === "tr"));
  for (const t of tracks) push(t);

  for (const track of ordered.slice(0, 8)) {
    const baseUrl = track.base_url;
    if (!baseUrl) continue;
    const lang = track.language_code ?? "en";
    const tries = [
      { fmt: "srv3" as const, kind: "xml" as const },
      { fmt: "json3" as const, kind: "json" as const },
    ];
    for (const { fmt, kind } of tries) {
      const url = captionUrlWithFmt(baseUrl, fmt);
      const res = await youtubeLikeFetch(url, {
        headers: { Accept: "*/*" },
      });
      if (!res.ok) continue;
      const body = await res.text();
      if (!body || body.length < 2) continue;
      const rows =
        kind === "xml"
          ? parseTimedtextXml(body, lang)
          : parseTimedtextJson3(body, lang);
      if (rows.length > 0) return rows;
    }
  }
  return [];
}

/**
 * Uses player caption tracks from InnerTube — does NOT call `/youtubei/v1/get_transcript`.
 * Tries several InnerTube clients; caption lists differ per client (especially from cloud IPs).
 */
async function fetchTranscriptViaYoutubei(
  videoIdRaw: string,
): Promise<TranscriptResponse[]> {
  const id = parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw.trim();
  if (!/^[\w-]{11}$/.test(id)) {
    throw new YoutubeTranscriptNotAvailableError(id);
  }

  const yt = await getInnertube();

  for (const client of INNERTUBE_CAPTION_CLIENTS) {
    let info;
    try {
      info = await yt.getInfo(id, { client });
    } catch {
      continue;
    }
    const caps = info.captions as
      | { caption_tracks?: InnertubeCaptionTrack[] }
      | null
      | undefined;
    const tracks = caps?.caption_tracks;
    if (!tracks?.length) continue;

    const rows = await fetchRowsFromInnertubeTracks(tracks);
    if (rows.length > 0) {
      console.warn(
        "[video-analysis] transcript: innertube caption URLs ok",
        id,
        `client=${client}`,
      );
      return rows;
    }
  }

  throw new YoutubeTranscriptNotAvailableError(id);
}

/**
 * When `DEEPGRAM_API_KEY` is set: **yt-dlp + Deepgram** first, then Innertube captions, then
 * player timedtext. Otherwise: Innertube → player (no `youtube-transcript` lang foot-gun).
 */
async function fetchTranscriptOnce(
  videoIdRaw: string,
): Promise<TranscriptResponse[]> {
  const vid = parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw.trim();
  /** YouTube caption paths rate-limited; Deepgram avoids that when configured. */
  let youtubeRateLimited = false;

  if (getDeepgramApiKey()) {
    try {
      const fromDg = await withTimeout(
        fetchTranscriptViaDeepgram(vid),
        DEEPGRAM_FETCH_TIMEOUT_MS,
        vid,
        false,
      );
      if (fromDg.length > 0) {
        console.warn("[video-analysis] transcript: deepgram ok (primary)", vid);
        return fromDg;
      }
    } catch {
      /* yt-dlp missing, Deepgram error, or timeout — fall back to YouTube captions */
    }
  }

  try {
    const fromY = await withTimeout(
      fetchTranscriptViaYoutubei(videoIdRaw),
      INNERTUBE_CAPTION_TIMEOUT_MS,
      vid,
      true,
    );
    if (fromY.length > 0) {
      console.warn("[video-analysis] transcript: innertube ok", vid);
      return fromY;
    }
  } catch (e) {
    if (e instanceof YoutubeTranscriptTooManyRequestError) {
      youtubeRateLimited = true;
    } else if (e instanceof YoutubeTranscriptVideoUnavailableError) {
      throw e;
    }
  }

  try {
    const fromT = await withTimeout(
      fetchTranscriptViaPlayerApi(videoIdRaw),
      FETCH_TRANSCRIPT_TIMEOUT_MS,
      vid,
      false,
    );
    if (fromT.length > 0) {
      console.warn("[video-analysis] transcript: player-api timedtext ok", vid);
      return fromT;
    }
  } catch (e) {
    if (e instanceof YoutubeTranscriptTooManyRequestError) {
      youtubeRateLimited = true;
      const recovered = await recoverFromRateLimit(videoIdRaw, vid, e);
      if (recovered.length > 0) {
        return recovered;
      }
    } else if (e instanceof YoutubeTranscriptVideoUnavailableError) {
      throw e;
    }
  }

  if (youtubeRateLimited && !getDeepgramApiKey()) {
    throw new YoutubeTranscriptTooManyRequestError();
  }

  throw new YoutubeTranscriptNotAvailableError(vid);
}

/**
 * Cached + in-flight dedupe: same `videoId` within ~45m hits memory instead of YouTube.
 */
export async function fetchTranscriptRobust(
  videoIdRaw: string,
): Promise<TranscriptResponse[]> {
  const vid = parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw.trim();
  if (!/^[\w-]{11}$/.test(vid)) {
    return fetchTranscriptOnce(videoIdRaw);
  }

  const now = Date.now();
  const hit = transcriptCache.get(vid);
  if (hit && hit.expires > now) {
    console.warn("[video-analysis] transcript: cache hit (fewer YouTube calls)", vid);
    return hit.rows.map((r) => ({ ...r }));
  }

  const pending = transcriptInflight.get(vid);
  if (pending) return pending;

  const p = (async () => {
    try {
      const rows = await fetchTranscriptOnce(videoIdRaw);
      if (rows.length > 0) {
        transcriptCache.set(vid, {
          rows: rows.map((r) => ({ ...r })),
          expires: Date.now() + TRANSCRIPT_CACHE_TTL_MS,
        });
        trimTranscriptCache();
      }
      return rows;
    } finally {
      transcriptInflight.delete(vid);
    }
  })();

  transcriptInflight.set(vid, p);
  return p;
}
