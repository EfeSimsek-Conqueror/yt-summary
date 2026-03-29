import { Innertube } from "youtubei.js";
import type { TranscriptResponse } from "youtube-transcript";
import {
  fetchTranscript,
  YoutubeTranscriptError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptTooManyRequestError,
} from "youtube-transcript";
import { parseYoutubeVideoId } from "./video-id";

const TRANSCRIPT_RATE_LIMIT_RETRIES = 3;
const TRANSCRIPT_RATE_LIMIT_BASE_DELAY_MS = 1500;

/** `youtube-transcript` is usually fast; cap so we never block the whole request forever. */
const FETCH_TRANSCRIPT_TIMEOUT_MS = 22_000;
/** Innertube + getTranscript can be slow; still cap so parallel `allSettled` completes. */
const YOUTUBEI_TRANSCRIPT_TIMEOUT_MS = 35_000;

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

async function fetchTranscriptViaYoutubei(
  videoIdRaw: string,
): Promise<TranscriptResponse[]> {
  const id = parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw.trim();
  if (!/^[\w-]{11}$/.test(id)) {
    throw new YoutubeTranscriptNotAvailableError(id);
  }

  const yt = await getInnertube();
  const info = await yt.getInfo(id);
  const transcriptInfo = await info.getTranscript();
  const segments = transcriptInfo.transcript.content?.body?.initial_segments;
  if (!segments?.length) {
    throw new YoutubeTranscriptNotAvailableError(id);
  }

  const out: TranscriptResponse[] = [];
  for (const seg of segments) {
    if (seg.type !== "TranscriptSegment") continue;
    const s = seg as {
      start_ms: string;
      end_ms: string;
      snippet: { toString(): string };
    };
    const startMs = parseInt(s.start_ms, 10);
    const endMs = parseInt(s.end_ms, 10);
    const text = s.snippet.toString().trim();
    if (!text) continue;
    const startSec = Number.isFinite(startMs) ? startMs / 1000 : 0;
    const durSec = Number.isFinite(endMs)
      ? Math.max(0, (endMs - startMs) / 1000)
      : 0;
    out.push({
      text,
      offset: startSec,
      duration: durSec,
    });
  }

  if (out.length === 0) {
    throw new YoutubeTranscriptNotAvailableError(id);
  }
  return out;
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
        fetchTranscript(videoId),
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
      fetchTranscript(videoIdRaw),
      FETCH_TRANSCRIPT_TIMEOUT_MS,
      vid,
      false,
    ),
    withTimeout(
      fetchTranscriptViaYoutubei(videoIdRaw),
      YOUTUBEI_TRANSCRIPT_TIMEOUT_MS,
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
      "[video-analysis] transcript fetch failed (non-library error); trying AI path",
      vid,
      errT,
      errY,
    );
    throw new YoutubeTranscriptNotAvailableError(vid);
  }
  throw new YoutubeTranscriptNotAvailableError(vid);
}
