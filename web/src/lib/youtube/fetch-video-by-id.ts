import type { Video } from "@/lib/types";
import { formatYoutubeDataApiErrorBody } from "@/lib/youtube/format-api-error";
import { formatDurationLabel } from "@/lib/youtube/iso-duration";

const YT = "https://www.googleapis.com/youtube/v3";

export type FetchVideoResult =
  | { ok: true; video: Video }
  | { ok: false; error: string; status: number };

/** Same env fallbacks as `api/youtube/video-comments` and related routes. */
export function getYoutubeDataApiKey(): string | null {
  return (
    process.env.YOUTUBE_DATA_API_KEY?.trim() ||
    process.env.YOUTUBE_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_CLOUD_API_KEY?.trim() ||
    null
  );
}

type YtVideoItem = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
  };
  contentDetails?: { duration?: string };
};

function videoFromListItem(item: YtVideoItem): Video | null {
  if (!item.id || !item.snippet) return null;
  const sn = item.snippet;
  const desc = sn.description ?? "";
  return {
    id: item.id,
    channelId: sn.channelId ?? "",
    channelTitle: sn.channelTitle,
    title: sn.title ?? "Untitled",
    durationLabel: formatDurationLabel(item.contentDetails?.duration ?? "PT0S"),
    summaryShort:
      desc.trim().slice(0, 160) ||
      "Summary will be generated after analysis.",
    transcriptPreview:
      desc.trim().slice(0, 800) ||
      "Transcript will appear here after processing.",
    segments: [],
    thumbnailUrl: sn.thumbnails?.high?.url ?? sn.thumbnails?.medium?.url,
    publishedAt: sn.publishedAt,
  };
}

function parseVideosListBody(data: unknown): FetchVideoResult {
  const payload = data as { items?: YtVideoItem[] };
  const item = payload.items?.[0];
  if (!item) {
    return { ok: false, error: "Video not found", status: 404 };
  }
  const video = videoFromListItem(item);
  if (!video) {
    return { ok: false, error: "Video not found", status: 404 };
  }
  return { ok: true, video };
}

async function fetchVideoList(
  videoId: string,
  auth: { type: "oauth"; accessToken: string } | { type: "apiKey"; key: string },
): Promise<FetchVideoResult> {
  try {
    const url = new URL(`${YT}/videos`);
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("id", videoId);
    if (auth.type === "apiKey") {
      url.searchParams.set("key", auth.key);
    }
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers:
        auth.type === "oauth"
          ? { Authorization: `Bearer ${auth.accessToken}` }
          : undefined,
    });
    if (!res.ok) {
      const raw = await res.text();
      return {
        ok: false,
        error: formatYoutubeDataApiErrorBody(raw, res.status),
        status: res.status,
      };
    }
    const data = await res.json();
    return parseVideosListBody(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg, status: 500 };
  }
}

export async function fetchVideoById(
  accessToken: string,
  videoId: string,
): Promise<FetchVideoResult> {
  return fetchVideoList(videoId, { type: "oauth", accessToken });
}

/** Public metadata via YouTube Data API key (no Google OAuth). */
export async function fetchVideoByIdWithApiKey(
  videoId: string,
): Promise<FetchVideoResult> {
  const key = getYoutubeDataApiKey();
  if (!key) {
    return { ok: false, error: "No YouTube Data API key configured", status: 401 };
  }
  return fetchVideoList(videoId, { type: "apiKey", key });
}
