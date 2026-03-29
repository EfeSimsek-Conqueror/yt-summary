import { Innertube } from "youtubei.js";
import type { TranscriptResponse } from "youtube-transcript";
import {
  fetchTranscript,
  YoutubeTranscriptError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptTooManyRequestError,
} from "youtube-transcript";
import { parseYoutubeVideoId } from "./video-id";
import {
  transcriptFetchOpts,
  youtubeLikeFetch,
} from "./youtube-transcript-fetch";

const TRANSCRIPT_RATE_LIMIT_RETRIES = 3;
const TRANSCRIPT_RATE_LIMIT_BASE_DELAY_MS = 1500;

/** `youtube-transcript` is usually fast; cap so we never block the whole request forever. */
const FETCH_TRANSCRIPT_TIMEOUT_MS = 22_000;
/** Innertube: multiple `getInfo` clients + caption fetches (no `/get_transcript`). */
const INNERTUBE_CAPTION_TIMEOUT_MS = 120_000;

let innertubePromise: Promise<Innertube> | null = null;

/** YouTube often returns `caption_tracks` for one client but not another (esp. server/datacenter IPs). */
const INNERTUBE_CAPTION_CLIENTS = [
  "WEB",
  "WEB_EMBEDDED",
  "MWEB",
  "ANDROID",
  "IOS",
] as const;

function errBrief(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
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
 * YouTube often omits `captionTracks` in server-side HTML unless a language is requested.
 * Tries common tracks after the default fetch failed (false "disabled" in the UI).
 */
async function fetchTranscriptWithLanguageFallbacks(
  videoIdRaw: string,
): Promise<TranscriptResponse[]> {
  const id = parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw.trim();
  const langTries: Array<{ lang: string }> = [
    { lang: "en" },
    { lang: "en-US" },
    { lang: "en-GB" },
    { lang: "tr" },
    { lang: "de" },
    { lang: "fr" },
    { lang: "es" },
    { lang: "it" },
    { lang: "pt" },
    { lang: "pt-BR" },
    { lang: "ja" },
    { lang: "ko" },
    { lang: "hi" },
  ];
  let lastErr: unknown;
  for (const cfg of langTries) {
    try {
      const rows = await withTimeout(
        fetchTranscript(videoIdRaw, { ...transcriptFetchOpts, ...cfg }),
        FETCH_TRANSCRIPT_TIMEOUT_MS,
        id,
        false,
      );
      if (rows?.length) {
        console.warn(
          `[video-analysis] transcript language fallback ok (${cfg.lang})`,
          id,
        );
        return rows;
      }
    } catch (e) {
      lastErr = e;
      if (e instanceof YoutubeTranscriptTooManyRequestError) throw e;
    }
  }
  if (lastErr) throw lastErr;
  return [];
}

/** Retries 2..N after the first attempt already failed with rate limit. */
async function fetchTranscriptRateLimitRetries(
  videoId: string,
): Promise<TranscriptResponse[]> {
  for (let attempt = 2; attempt <= TRANSCRIPT_RATE_LIMIT_RETRIES; attempt++) {
    const delayMs =
      TRANSCRIPT_RATE_LIMIT_BASE_DELAY_MS * 2 ** (attempt - 1);
    console.warn(
      `[video-analysis] transcript rate limited, retry ${attempt}/${TRANSCRIPT_RATE_LIMIT_RETRIES} in ${delayMs}ms`,
    );
    await new Promise((r) => setTimeout(r, delayMs));
    try {
      return await withTimeout(
        fetchTranscript(videoId, transcriptFetchOpts),
        FETCH_TRANSCRIPT_TIMEOUT_MS,
        parseYoutubeVideoId(videoId) ?? videoId.trim(),
        false,
      );
    } catch (e) {
      if (
        e instanceof YoutubeTranscriptTooManyRequestError &&
        attempt < TRANSCRIPT_RATE_LIMIT_RETRIES
      ) {
        continue;
      }
      throw e;
    }
  }
  throw new Error("fetchTranscriptRateLimitRetries: unreachable");
}

/**
 * Runs `youtube-transcript` and `youtubei.js` **in parallel** so we do not wait
 * for transcript retries/backoff before trying Innertube (major latency win).
 */
export async function fetchTranscriptRobust(
  videoIdRaw: string,
): Promise<TranscriptResponse[]> {
  const vid = parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw.trim();
  const parallel = await Promise.allSettled([
    withTimeout(
      fetchTranscript(videoIdRaw, transcriptFetchOpts),
      FETCH_TRANSCRIPT_TIMEOUT_MS,
      vid,
      false,
    ),
    withTimeout(
      fetchTranscriptViaYoutubei(videoIdRaw),
      INNERTUBE_CAPTION_TIMEOUT_MS,
      vid,
      true,
    ),
  ]);

  const fromT =
    parallel[0].status === "fulfilled" ? parallel[0].value : null;
  const fromY =
    parallel[1].status === "fulfilled" ? parallel[1].value : null;
  const errT =
    parallel[0].status === "rejected" ? parallel[0].reason : undefined;
  const errY =
    parallel[1].status === "rejected" ? parallel[1].reason : undefined;

  if (fromT && fromT.length > 0) {
    return fromT;
  }
  if (fromY && fromY.length > 0) {
    const vid = parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw;
    console.warn(
      "[video-analysis] transcript: using innertube caption URLs (youtube-transcript empty/failed)",
      vid,
    );
    return fromY;
  }

  try {
    const viaLang = await fetchTranscriptWithLanguageFallbacks(videoIdRaw);
    if (viaLang.length > 0) {
      return viaLang;
    }
  } catch (e) {
    if (e instanceof YoutubeTranscriptTooManyRequestError) {
      try {
        return await fetchTranscriptRateLimitRetries(videoIdRaw);
      } catch (retryErr) {
        console.warn(
          "[video-analysis] transcript: rate-limit retry failed",
          parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw,
          {
            youtubeTranscript: errBrief(errT),
            innertubeCaptions: errBrief(errY),
          },
        );
        throw retryErr;
      }
    }
  }

  if (errT instanceof YoutubeTranscriptTooManyRequestError) {
    try {
      return await fetchTranscriptRateLimitRetries(videoIdRaw);
    } catch (retryErr) {
      console.warn(
        "[video-analysis] transcript: rate-limit retry failed",
        parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw,
        {
          youtubeTranscript: errBrief(errT),
          innertubeCaptions: errBrief(errY),
        },
      );
      throw retryErr;
    }
  }

  if (errT instanceof YoutubeTranscriptError) {
    console.warn(
      "[video-analysis] transcript: youtube-transcript failed (innertube state below)",
      parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw,
      { innertubeCaptions: errBrief(errY) },
    );
    throw errT;
  }
  if (errY instanceof YoutubeTranscriptError) {
    throw errY;
  }
  if (errT || errY) {
    console.warn("[video-analysis] transcript: all automatic sources failed", vid, {
      youtubeTranscript: errBrief(errT),
      innertubeCaptions: errBrief(errY),
    });
    throw new YoutubeTranscriptNotAvailableError(vid);
  }
  throw new YoutubeTranscriptNotAvailableError(vid);
}
