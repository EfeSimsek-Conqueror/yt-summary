import { formatYoutubeDataApiErrorBody } from "@/lib/youtube/format-api-error";

export type YoutubeSubscriptionRow = {
  id: string;
  title: string;
  thumbnailUrl?: string;
};

export type FetchSubscriptionsResult =
  | { ok: true; channels: YoutubeSubscriptionRow[] }
  | { ok: false; error: string; status: number };

/**
 * Calls YouTube Data API v3 subscriptions.list with a Google OAuth access token
 * that includes the youtube.readonly scope.
 */
export async function fetchYoutubeSubscriptions(
  accessToken: string,
): Promise<FetchSubscriptionsResult> {
  const channels: YoutubeSubscriptionRow[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const url = new URL("https://www.googleapis.com/youtube/v3/subscriptions");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("mine", "true");
      url.searchParams.set("maxResults", "50");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.text();
        return {
          ok: false,
          error: formatYoutubeDataApiErrorBody(
            body || res.statusText,
            res.status,
          ),
          status: res.status,
        };
      }

      const data = (await res.json()) as {
        items?: Array<{
          snippet?: {
            title?: string;
            resourceId?: { channelId?: string };
            thumbnails?: { default?: { url?: string } };
          };
        }>;
        nextPageToken?: string;
      };

      for (const item of data.items ?? []) {
        const sn = item.snippet;
        const id = sn?.resourceId?.channelId;
        if (!id || !sn?.title) continue;
        channels.push({
          id,
          title: sn.title,
          thumbnailUrl: sn.thumbnails?.default?.url,
        });
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    return { ok: true, channels };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg, status: 500 };
  }
}
