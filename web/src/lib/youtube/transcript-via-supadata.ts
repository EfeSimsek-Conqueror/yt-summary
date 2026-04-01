import type { TranscriptResponse } from "youtube-transcript";
import {
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";
import { readSupadataApiKey } from "@/lib/server/supadata-env";
import { youtubeWatchUrl } from "./video-id";

const BASE = "https://api.supadata.ai/v1";

const POLL_MS = 2000;
const MAX_POLL_MS = 14 * 60 * 1000;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** @deprecated Use readSupadataApiKey from @/lib/server/supadata-env — kept for imports. */
export function getSupadataApiKey(): string | undefined {
  return readSupadataApiKey();
}

type TranscriptChunk = {
  text: string;
  offset: number;
  duration: number;
  lang?: string;
};

type TranscriptOk = {
  content: TranscriptChunk[] | string;
  lang: string;
  availableLangs: string[];
};

function isChunkArray(v: unknown): v is TranscriptChunk[] {
  return (
    Array.isArray(v) &&
    v.every(
      (x) =>
        x &&
        typeof x === "object" &&
        typeof (x as TranscriptChunk).text === "string" &&
        typeof (x as TranscriptChunk).offset === "number" &&
        typeof (x as TranscriptChunk).duration === "number",
    )
  );
}

/** Supadata offset/duration are ms; we store seconds for `captionStartSeconds` heuristics. */
function chunksToRows(chunks: TranscriptChunk[], fallbackLang: string): TranscriptResponse[] {
  return chunks.map((c) => ({
    text: c.text,
    offset: c.offset / 1000,
    duration: c.duration / 1000,
    lang: c.lang ?? fallbackLang,
  }));
}

function parseTranscriptBody(data: unknown, videoId: string): TranscriptResponse[] {
  if (!data || typeof data !== "object") {
    throw new Error("Supadata: invalid transcript response");
  }
  const o = data as TranscriptOk;
  const lang = typeof o.lang === "string" ? o.lang : "en";
  if (typeof o.content === "string") {
    const t = o.content.trim();
    if (!t) throw new YoutubeTranscriptNotAvailableError(videoId);
    return [{ text: t, offset: 0, duration: 1, lang }];
  }
  if (!isChunkArray(o.content) || o.content.length === 0) {
    throw new YoutubeTranscriptNotAvailableError(videoId);
  }
  return chunksToRows(o.content, lang);
}

async function mapSupadataError(res: Response, videoId: string): Promise<never> {
  let body: { error?: string; message?: string; details?: string } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    /* ignore */
  }
  const code = body.error;
  const msg = [body.message, body.details].filter(Boolean).join(" — ") || res.statusText;
  if (code === "transcript-unavailable") {
    throw new YoutubeTranscriptNotAvailableError(videoId);
  }
  if (code === "not-found") {
    throw new YoutubeTranscriptVideoUnavailableError(videoId);
  }
  if (code === "limit-exceeded") {
    throw new YoutubeTranscriptTooManyRequestError();
  }
  if (code === "unauthorized" || res.status === 401) {
    throw new Error("Supadata: invalid or missing SUPADATA_API_KEY");
  }
  throw new Error(`Supadata HTTP ${res.status}: ${msg}`);
}

async function pollTranscriptJob(
  jobId: string,
  apiKey: string,
  videoId: string,
): Promise<TranscriptResponse[]> {
  const deadline = Date.now() + MAX_POLL_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/transcript/${encodeURIComponent(jobId)}`, {
      headers: { "x-api-key": apiKey, Accept: "application/json" },
    });
    if (!res.ok) {
      await mapSupadataError(res, videoId);
    }
    const data = (await res.json()) as {
      status?: string;
      content?: unknown;
      lang?: string;
      error?: { error?: string; message?: string };
    };
    const st = data.status;
    if (st === "completed") {
      return parseTranscriptBody(data, videoId);
    }
    if (st === "failed") {
      const err = data.error?.error;
      if (err === "transcript-unavailable") {
        throw new YoutubeTranscriptNotAvailableError(videoId);
      }
      throw new Error(
        data.error?.message ?? "Supadata transcript job failed",
      );
    }
    await delay(POLL_MS);
  }
  throw new YoutubeTranscriptNotAvailableError(videoId);
}

/**
 * GET /v1/transcript — passes full YouTube `url` (same as Supadata Playground).
 * Default `mode=native` (Playground default); set SUPADATA_TRANSCRIPT_MODE=auto to try AI if no captions.
 * @see https://docs.supadata.ai/api-reference/endpoint/transcript/transcript
 */
export async function fetchTranscriptViaSupadata(
  videoId: string,
  /** When set (e.g. from API route), avoids a second env read. */
  apiKeyOverride?: string,
): Promise<TranscriptResponse[]> {
  const apiKey = apiKeyOverride?.trim() || readSupadataApiKey();
  if (!apiKey) {
    throw new Error("SUPADATA_API_KEY is not configured");
  }

  const url = youtubeWatchUrl(videoId);
  const params = new URLSearchParams({
    url,
    text: "false",
    mode: process.env.SUPADATA_TRANSCRIPT_MODE?.trim() || "native",
  });
  const lang = process.env.SUPADATA_LANG?.trim();
  if (lang) params.set("lang", lang);

  const res = await fetch(`${BASE}/transcript?${params}`, {
    headers: { "x-api-key": apiKey, Accept: "application/json" },
  });

  if (res.status === 202) {
    const job = (await res.json()) as { jobId?: string };
    if (!job.jobId) {
      throw new Error("Supadata: 202 without jobId");
    }
    console.warn(
      "[video-analysis] transcript: supadata async job",
      videoId,
      job.jobId,
    );
    return pollTranscriptJob(job.jobId, apiKey, videoId);
  }

  if (!res.ok) {
    await mapSupadataError(res, videoId);
  }

  const data = await res.json();
  const rows = parseTranscriptBody(data, videoId);
  if (rows.length > 0) {
    console.warn("[video-analysis] transcript: supadata ok", videoId);
  }
  return rows;
}
