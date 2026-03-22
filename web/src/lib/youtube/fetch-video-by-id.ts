import type { Video } from "@/lib/types";
import { formatDurationLabel } from "@/lib/youtube/iso-duration";

const YT = "https://www.googleapis.com/youtube/v3";

export type FetchVideoResult =
  | { ok: true; video: Video }
  | { ok: false; error: string; status: number };

export async function fetchVideoById(
  accessToken: string,
  videoId: string,
): Promise<FetchVideoResult> {
  try {
    const url = new URL(`${YT}/videos`);
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("id", videoId);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: await res.text(), status: res.status };
    }
    const data = (await res.json()) as {
      items?: Array<{
        id?: string;
        snippet?: {
          title?: string;
          description?: string;
          channelId?: string;
          channelTitle?: string;
          thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
        };
        contentDetails?: { duration?: string };
      }>;
    };
    const item = data.items?.[0];
    if (!item?.id || !item.snippet) {
      return { ok: false, error: "Video not found", status: 404 };
    }
    const sn = item.snippet;
    const desc = sn.description ?? "";
    const video: Video = {
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
      thumbnailUrl:
        sn.thumbnails?.high?.url ?? sn.thumbnails?.medium?.url,
    };
    return { ok: true, video };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg, status: 500 };
  }
}
