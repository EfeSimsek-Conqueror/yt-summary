import { getResolvedGoogleAccessToken } from "@/lib/google/resolve-google-access-token";
import { createClient } from "@/lib/supabase/server";
import { channels as mockChannels } from "@/lib/mock-data";
import type { Channel } from "@/lib/types";
import { fetchYoutubeSubscriptions } from "@/lib/youtube/fetch-subscriptions";

export type ChannelsForUserResult = {
  channels: Channel[];
  source: "youtube" | "mock";
  /** Logged in but token has no YouTube scope — sign out and sign in again */
  needsYoutubeScope?: boolean;
  /** API or network error message (dev-oriented) */
  youtubeError?: string;
};

/**
 * Resolves sidebar channels: real YouTube subs when we have a Google access token
 * (session.provider_token or refresh-token exchange); otherwise mock list.
 */
export async function getChannelsForUser(): Promise<ChannelsForUserResult> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { channels: mockChannels, source: "mock" };
  }

  const accessToken = await getResolvedGoogleAccessToken();
  if (!accessToken) {
    return {
      channels: mockChannels,
      source: "mock",
      needsYoutubeScope: true,
    };
  }

  const result = await fetchYoutubeSubscriptions(accessToken);

  if (!result.ok) {
    return {
      channels: mockChannels,
      source: "mock",
      youtubeError: result.error,
      needsYoutubeScope: result.status === 401 || result.status === 403,
    };
  }

  if (result.channels.length === 0) {
    return { channels: [], source: "youtube" };
  }

  return {
    channels: result.channels.map((c) => ({
      id: c.id,
      title: c.title,
      thumbnailUrl: c.thumbnailUrl,
    })),
    source: "youtube",
  };
}
