import type { TranscriptResponse } from "youtube-transcript";
import { YoutubeTranscriptNotAvailableError } from "youtube-transcript";
import { parseYoutubeVideoId } from "./video-id";
import {
  fetchTranscriptViaSupadata,
  getSupadataApiKey,
} from "./transcript-via-supadata";

/** Reuse transcript for the same video to avoid repeat API calls. */
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

const SUPADATA_FETCH_TIMEOUT_MS = 15 * 60 * 1000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  videoId: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
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

/**
 * Transcript source: **Supadata only** (`GET /v1/transcript`).
 * Requires `SUPADATA_API_KEY` (https://supadata.ai).
 */
async function fetchTranscriptOnce(
  videoIdRaw: string,
): Promise<TranscriptResponse[]> {
  const vid = parseYoutubeVideoId(videoIdRaw) ?? videoIdRaw.trim();
  if (!/^[\w-]{11}$/.test(vid)) {
    throw new YoutubeTranscriptNotAvailableError(vid);
  }

  if (!getSupadataApiKey()) {
    throw new Error(
      "SUPADATA_API_KEY is not configured on the server. Transcripts require Supadata.",
    );
  }

  try {
    const rows = await withTimeout(
      fetchTranscriptViaSupadata(vid),
      SUPADATA_FETCH_TIMEOUT_MS,
      vid,
    );
    if (rows.length > 0) {
      return rows;
    }
    console.warn("[video-analysis] transcript: supadata returned no rows", vid);
  } catch (e) {
    if (e instanceof YoutubeTranscriptNotAvailableError) {
      console.warn(
        "[video-analysis] transcript: supadata timed out or unavailable",
        vid,
      );
      throw e;
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[video-analysis] transcript: supadata failed", vid, msg);
    throw e;
  }

  throw new YoutubeTranscriptNotAvailableError(vid);
}

/**
 * Cached + in-flight dedupe: same `videoId` within ~45m hits memory instead of repeat work.
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
    console.warn("[video-analysis] transcript: cache hit", vid);
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
