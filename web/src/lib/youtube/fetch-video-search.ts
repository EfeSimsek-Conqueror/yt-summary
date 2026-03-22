import type { Video } from "@/lib/types";
import { formatDurationLabel } from "@/lib/youtube/iso-duration";

const YT = "https://www.googleapis.com/youtube/v3";

export type FetchVideoSearchResult =
  | { ok: true; videos: Video[] }
  | { ok: false; error: string; status: number };

const MAX_QUERY_LEN = 200;

/**
 * YouTube search.list (100 quota units) + videos.list for durations.
 * Requires OAuth with https://www.googleapis.com/auth/youtube.readonly
 */
export async function fetchYoutubeVideoSearch(
  accessToken: string,
  query: string,
  maxResults = 20,
): Promise<FetchVideoSearchResult> {
  const q = query.trim();
  if (!q) {
    return { ok: true, videos: [] };
  }
  if (q.length > MAX_QUERY_LEN) {
    return {
      ok: false,
      error: "Search query is too long.",
      status: 400,
    };
  }

  try {
    const searchUrl = new URL(`${YT}/search`);
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("q", q);
    searchUrl.searchParams.set("maxResults", String(Math.min(maxResults, 50)));

    const searchRes = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!searchRes.ok) {
      return {
        ok: false,
        error: await searchRes.text(),
        status: searchRes.status,
      };
    }

    const searchJson = (await searchRes.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          description?: string;
          channelId?: string;
          channelTitle?: string;
          thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
        };
      }>;
    };

    const ids: string[] = [];
    const metaById = new Map<
      string,
      {
        title: string;
        description: string;
        channelId: string;
        channelTitle?: string;
        thumb?: string;
      }
    >();

    for (const row of searchJson.items ?? []) {
      const vid = row.id?.videoId;
      if (!vid) continue;
      const sn = row.snippet;
      ids.push(vid);
      metaById.set(vid, {
        title: sn?.title ?? "Untitled",
        description: sn?.description ?? "",
        channelId: sn?.channelId ?? "",
        channelTitle: sn?.channelTitle,
        thumb:
          sn?.thumbnails?.high?.url ?? sn?.thumbnails?.medium?.url,
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
        const meta = metaById.get(vid);
        const title =
          item.snippet?.title ?? meta?.title ?? "Untitled";
        const desc =
          item.snippet?.description ?? meta?.description ?? "";
        const durationIso = item.contentDetails?.duration ?? "PT0S";
        const summary =
          desc.trim().slice(0, 160) ||
          "Open for details and run transcript + analysis when available.";
        const channelId = meta?.channelId ?? "";

        videos.push({
          id: vid,
          channelId,
          title,
          durationLabel: formatDurationLabel(durationIso),
          summaryShort: summary,
          transcriptPreview:
            "Transcript and segment analysis will appear here after processing.",
          segments: [],
          thumbnailUrl: meta?.thumb,
          channelTitle: meta?.channelTitle,
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
