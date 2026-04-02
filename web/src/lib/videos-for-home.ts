import { getResolvedGoogleAccessToken } from "@/lib/google/resolve-google-access-token";
import { getVideosForChannel } from "@/lib/mock-data";
import type { Video } from "@/lib/types";
import { fetchChannelUploads } from "@/lib/youtube/fetch-channel-uploads";
import { fetchYoutubeVideoSearch } from "@/lib/youtube/fetch-video-search";

const YOUTUBE_CHANNEL_PREFIX = "UC";

export type HomeVideosResult = {
  videos: Video[];
  /** YouTube API failure while loading uploads */
  uploadsError?: string;
};

/**
 * Mock catalog for short ids (c1, …); otherwise loads uploads via YouTube API when possible.
 */
export async function getVideosForHome(
  channelId: string,
  subscriptionSource: "youtube" | "mock",
): Promise<HomeVideosResult> {
  if (!channelId.startsWith(YOUTUBE_CHANNEL_PREFIX)) {
    return { videos: getVideosForChannel(channelId) };
  }

  if (subscriptionSource !== "youtube") {
    return { videos: [] };
  }

  const accessToken = await getResolvedGoogleAccessToken();
  if (!accessToken) {
    return { videos: [], uploadsError: "missing_provider_token" };
  }

  const result = await fetchChannelUploads(
    accessToken,
    channelId,
    24,
  );

  if (!result.ok) {
    return {
      videos: [],
      uploadsError: result.error,
    };
  }

  return { videos: result.videos };
}

/**
 * Global YouTube search (search.list). Same auth as uploads; high quota cost per request.
 */
export async function getVideosFromYoutubeSearch(
  query: string,
  subscriptionSource: "youtube" | "mock",
): Promise<HomeVideosResult> {
  const q = query.trim();
  if (!q) {
    return { videos: [] };
  }

  if (subscriptionSource !== "youtube") {
    return {
      videos: [],
      uploadsError: "search_requires_youtube",
    };
  }

  const accessToken = await getResolvedGoogleAccessToken();
  if (!accessToken) {
    return { videos: [], uploadsError: "missing_provider_token" };
  }

  const result = await fetchYoutubeVideoSearch(
    accessToken,
    q,
    20,
  );

  if (!result.ok) {
    return {
      videos: [],
      uploadsError: result.error,
    };
  }

  return { videos: result.videos };
}
