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
/** Innertube getInfo + caption XML fetch (no `/get_transcript` — avoids 400 FAILED_PRECONDITION). */
const INNERTUBE_CAPTION_TIMEOUT_MS = 40_000;

let innertubePromise: Promise<Innertube> | null = null;

function getInnertube(): Promise<Innertube> {
  if (!innertubePromise) {
    innertubePromise = Innertube.create();
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

function ensureSrv3Fmt(baseUrl: string): string {
  try {
    const u = new URL(baseUrl);
    if (!u.searchParams.has("fmt")) u.searchParams.set("fmt", "srv3");
    return u.toString();
  } catch {
    return baseUrl.includes("fmt=")
      ? baseUrl
      : `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}fmt=srv3`;
  }
}

type InnertubeCaptionTrack = {
  base_url?: string;
  language_code?: string;
};

/**
 * Uses player `captionTracks[].baseUrl` from InnerTube — does NOT call `/youtubei/v1/get_transcript`
 * (that endpoint often returns 400 FAILED_PRECONDITION for server/bot clients).
 */
async function fetchTranscriptViaYoutubei(
  videoIdRaw: string,
): Promise<TranscriptResponse[]> {
  const id = parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw.trim();
  if (!/^[\w-]{11}$/.test(id)) {
    throw new YoutubeTranscriptNotAvailableError(id);
  }

  const yt = await getInnertube();
  const info = await yt.getInfo(id);
  const caps = info.captions as
    | { caption_tracks?: InnertubeCaptionTrack[] }
    | null
    | undefined;
  const tracks = caps?.caption_tracks;
  if (!tracks?.length) {
    throw new YoutubeTranscriptNotAvailableError(id);
  }

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
    const url = ensureSrv3Fmt(baseUrl);
    const res = await youtubeLikeFetch(url, {
      headers: { Accept: "*/*" },
    });
    if (!res.ok) continue;
    const xml = await res.text();
    const lang = track.language_code ?? "en";
    const rows = parseTimedtextXml(xml, lang);
    if (rows.length > 0) return rows;
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
    { lang: "tr" },
    { lang: "de" },
    { lang: "fr" },
    { lang: "es" },
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
      "[video-analysis] transcript recovered via youtubei.js fallback",
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
          "[video-analysis] youtubei.js transcript fallback failed",
          parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw,
          errY,
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
        "[video-analysis] youtubei.js transcript fallback failed",
        parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw,
        errY,
      );
      throw retryErr;
    }
  }

  if (errT instanceof YoutubeTranscriptError) {
    console.warn(
      "[video-analysis] youtubei.js transcript fallback failed",
      parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw,
      errY,
    );
    throw errT;
  }
  if (errY instanceof YoutubeTranscriptError) {
    throw errY;
  }
  if (errT || errY) {
    console.warn(
      "[video-analysis] transcript fetch failed after fallbacks",
      vid,
      errT,
      errY,
    );
    throw new YoutubeTranscriptNotAvailableError(vid);
  }
  throw new YoutubeTranscriptNotAvailableError(vid);
}
