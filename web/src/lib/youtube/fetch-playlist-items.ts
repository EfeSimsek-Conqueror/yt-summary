import type { Video } from "@/lib/types";
import { formatYoutubeDataApiErrorBody } from "@/lib/youtube/format-api-error";
import { formatDurationLabel } from "@/lib/youtube/iso-duration";

const YT = "https://www.googleapis.com/youtube/v3";

export type FetchPlaylistResult =
  | { ok: true; videos: Video[]; playlistTitle?: string }
  | { ok: false; error: string; status: number };

/**
 * Fetch all videos in a YouTube playlist (playlistItems.list + videos.list for durations).
 */
export async function fetchPlaylistItems(
  accessToken: string,
  playlistId: string,
  maxResults = 50,
): Promise<FetchPlaylistResult> {
  try {
    const plUrl = new URL(`${YT}/playlistItems`);
    plUrl.searchParams.set("part", "snippet,contentDetails");
    plUrl.searchParams.set("playlistId", playlistId);
    plUrl.searchParams.set("maxResults", String(Math.min(maxResults, 50)));

    const plRes = await fetch(plUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!plRes.ok) {
      const raw = await plRes.text();
      return {
        ok: false,
        error: formatYoutubeDataApiErrorBody(raw, plRes.status),
        status: plRes.status,
      };
    }

    const plJson = (await plRes.json()) as {
      items?: Array<{
        snippet?: {
          title?: string;
          description?: string;
          publishedAt?: string;
          channelTitle?: string;
          thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
          resourceId?: { videoId?: string };
        };
      }>;
    };

    const ids: string[] = [];
    const snippetById = new Map<
      string,
      {
        title: string;
        description: string;
        thumb?: string;
        channelTitle?: string;
        publishedAt?: string;
      }
    >();

    for (const row of plJson.items ?? []) {
      const vid = row.snippet?.resourceId?.videoId;
      if (!vid) continue;
      ids.push(vid);
      snippetById.set(vid, {
        title: row.snippet?.title ?? "Untitled",
        description: row.snippet?.description ?? "",
        thumb:
          row.snippet?.thumbnails?.high?.url ??
          row.snippet?.thumbnails?.medium?.url,
        channelTitle: row.snippet?.channelTitle,
        publishedAt: row.snippet?.publishedAt,
      });
    }

    if (ids.length === 0) {
      return { ok: true, videos: [] };
    }

    const videos: Video[] = [];
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const vUrl = new URL(`${YT}/videos`);
      vUrl.searchParams.set("part", "snippet,contentDetails");
      vUrl.searchParams.set("id", batch.join(","));

      const vRes = await fetch(vUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!vRes.ok) {
        const raw = await vRes.text();
        return {
          ok: false,
          error: formatYoutubeDataApiErrorBody(raw, vRes.status),
          status: vRes.status,
        };
      }
      const vJson = (await vRes.json()) as {
        items?: Array<{
          id?: string;
          contentDetails?: { duration?: string };
          snippet?: {
            title?: string;
            description?: string;
            channelId?: string;
            channelTitle?: string;
            publishedAt?: string;
          };
        }>;
      };

      for (const item of vJson.items ?? []) {
        const vid = item.id;
        if (!vid) continue;
        const sn = snippetById.get(vid);
        const title = item.snippet?.title ?? sn?.title ?? "Untitled";
        const desc = item.snippet?.description ?? sn?.description ?? "";
        const durationIso = item.contentDetails?.duration ?? "PT0S";
        const summary =
          desc.trim().slice(0, 160) ||
          "Open for details and run transcript + analysis when available.";

        videos.push({
          id: vid,
          channelId: item.snippet?.channelId ?? "",
          channelTitle: item.snippet?.channelTitle ?? sn?.channelTitle,
          title,
          durationLabel: formatDurationLabel(durationIso),
          summaryShort: summary,
          transcriptPreview:
            "Transcript and segment analysis will appear here after processing.",
          segments: [],
          thumbnailUrl: sn?.thumb,
          publishedAt: item.snippet?.publishedAt ?? sn?.publishedAt,
        });
      }
    }

    const order = new Map(ids.map((id, idx) => [id, idx]));
    videos.sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );

    return { ok: true, videos };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg, status: 500 };
  }
}
