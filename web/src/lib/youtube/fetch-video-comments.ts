export type TopVideoComment = {
  author: string;
  text: string;
  likeCount: number;
};

type ThreadsResponse = {
  items?: Array<{
    snippet?: {
      topLevelComment?: {
        snippet?: {
          authorDisplayName?: string;
          textOriginal?: string;
          textDisplay?: string;
          likeCount?: number;
        };
      };
    };
  }>;
  nextPageToken?: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/**
 * Fetches comment threads and returns the 10 with the highest like counts.
 * Requires YouTube Data API v3 enabled for the API key.
 */
export async function fetchTopLikedComments(
  videoId: string,
  apiKey: string,
  opts?: { maxPages?: number },
): Promise<{ ok: true; comments: TopVideoComment[] } | { ok: false; error: string }> {
  const maxPages = opts?.maxPages ?? 3;
  const collected: TopVideoComment[] = [];
  let pageToken: string | undefined;

  try {
    for (let page = 0; page < maxPages; page++) {
      const url = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("videoId", videoId);
      url.searchParams.set("maxResults", "100");
      url.searchParams.set("order", "relevance");
      url.searchParams.set("textFormat", "plainText");
      url.searchParams.set("key", apiKey);
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }

      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) {
        const t = await res.text();
        return {
          ok: false,
          error: res.status === 403
            ? "Comments unavailable (check API key or quota)."
            : `Comments request failed (${res.status}). ${t.slice(0, 120)}`,
        };
      }

      const data = (await res.json()) as ThreadsResponse;
      const items = data.items ?? [];

      for (const item of items) {
        const sn = item.snippet?.topLevelComment?.snippet;
        if (!sn) continue;
        const raw =
          typeof sn.textOriginal === "string" && sn.textOriginal.trim()
            ? sn.textOriginal
            : typeof sn.textDisplay === "string"
              ? stripHtml(sn.textDisplay)
              : "";
        if (!raw.trim()) continue;
        collected.push({
          author: sn.authorDisplayName?.trim() || "Unknown",
          text: raw.trim(),
          likeCount:
            typeof sn.likeCount === "number" && sn.likeCount >= 0
              ? sn.likeCount
              : 0,
        });
      }

      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }

    collected.sort((a, b) => b.likeCount - a.likeCount);
    const top = collected.slice(0, 10);
    return { ok: true, comments: top };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load comments",
    };
  }
}
