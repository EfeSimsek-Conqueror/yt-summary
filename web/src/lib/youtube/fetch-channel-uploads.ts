import type { Video } from "@/lib/types";
import { formatDurationLabel } from "@/lib/youtube/iso-duration";

const YT = "https://www.googleapis.com/youtube/v3";

export type FetchUploadsResult =
  | { ok: true; videos: Video[] }
  | { ok: false; error: string; status: number };

/**
 * Latest uploads for a channel: channels.list → uploads playlist → playlistItems → videos.list (durations).
 */
export async function fetchChannelUploads(
  accessToken: string,
  channelId: string,
  maxResults = 24,
): Promise<FetchUploadsResult> {
  try {
    const chUrl = new URL(`${YT}/channels`);
    chUrl.searchParams.set("part", "contentDetails");
    chUrl.searchParams.set("id", channelId);

    const chRes = await fetch(chUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!chRes.ok) {
      return {
        ok: false,
        error: await chRes.text(),
        status: chRes.status,
      };
    }
    const chJson = (await chRes.json()) as {
      items?: Array<{
        contentDetails?: { relatedPlaylists?: { uploads?: string } };
      }>;
    };
    const uploadsPlaylistId =
      chJson.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      return { ok: true, videos: [] };
    }

    const plUrl = new URL(`${YT}/playlistItems`);
    plUrl.searchParams.set("part", "snippet,contentDetails");
    plUrl.searchParams.set("playlistId", uploadsPlaylistId);
    plUrl.searchParams.set("maxResults", String(Math.min(maxResults, 50)));

    const plRes = await fetch(plUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!plRes.ok) {
      return {
        ok: false,
        error: await plRes.text(),
        status: plRes.status,
      };
    }
    const plJson = (await plRes.json()) as {
      items?: Array<{
        snippet?: {
          title?: string;
          description?: string;
          thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
          resourceId?: { videoId?: string };
        };
      }>;
    };

    const ids: string[] = [];
    const snippetById = new Map<
      string,
      { title: string; description: string; thumb?: string }
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
        return {
          ok: false,
          error: await vRes.text(),
          status: vRes.status,
        };
      }
      const vJson = (await vRes.json()) as {
        items?: Array<{
          id?: string;
          contentDetails?: { duration?: string };
          snippet?: { title?: string; description?: string };
        }>;
      };

      for (const item of vJson.items ?? []) {
        const vid = item.id;
        if (!vid) continue;
        const sn = snippetById.get(vid);
        const title =
          item.snippet?.title ?? sn?.title ?? "Untitled";
        const desc =
          item.snippet?.description ?? sn?.description ?? "";
        const durationIso = item.contentDetails?.duration ?? "PT0S";
        const summary =
          desc.trim().slice(0, 160) ||
          "Open for details and run transcript + analysis when available.";

        videos.push({
          id: vid,
          channelId,
          title,
          durationLabel: formatDurationLabel(durationIso),
          summaryShort: summary,
          transcriptPreview:
            "Transcript and segment analysis will appear here after processing.",
          segments: [],
          thumbnailUrl: sn?.thumb,
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
