import { getResolvedGoogleAccessToken } from "@/lib/google/resolve-google-access-token";
import { vidError, vidLog } from "@/lib/server/vid-log";
import { getServerAuthUser } from "@/lib/supabase/server-auth";
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
  const {
    data: { user },
    error: authError,
  } = await getServerAuthUser();

  if (authError || !user) {
    vidLog("channels", "anonymous session — mock channels");
    return { channels: mockChannels, source: "mock" };
  }

  const accessToken = await getResolvedGoogleAccessToken();
  if (!accessToken) {
    vidLog("channels", "no Google access token — needs YouTube OAuth / linking", {
      userId: user.id,
    });
    return {
      channels: mockChannels,
      source: "mock",
      needsYoutubeScope: true,
    };
  }

  const result = await fetchYoutubeSubscriptions(accessToken);

  if (!result.ok) {
    vidError("channels", "YouTube subscriptions API failed", {
      userId: user.id,
      status: result.status,
      errorPreview: result.error?.slice(0, 200) ?? null,
      needsScopeHint: result.status === 401 || result.status === 403,
    });
    return {
      channels: mockChannels,
      source: "mock",
      youtubeError: result.error,
      needsYoutubeScope: result.status === 401 || result.status === 403,
    };
  }

  if (result.channels.length === 0) {
    vidLog("channels", "YouTube returned zero subscriptions", {
      userId: user.id,
    });
    return { channels: [], source: "youtube" };
  }

  vidLog("channels", "loaded YouTube subscriptions", {
    userId: user.id,
    count: result.channels.length,
  });

  return {
    channels: result.channels.map((c) => ({
      id: c.id,
      title: c.title,
      thumbnailUrl: c.thumbnailUrl,
    })),
    source: "youtube",
  };
}
