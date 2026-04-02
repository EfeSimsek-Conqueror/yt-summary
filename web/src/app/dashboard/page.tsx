import { AppShell } from "@/components/app-shell";
import { VideoCard } from "@/components/video-card";
import { VideoSearchBar } from "@/components/video-search-bar";
import { YoutubeSyncHint } from "@/components/youtube-sync-hint";
import { getChannelsForUser } from "@/lib/channels-for-user";
import { getChannel } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import {
  getVideosForHome,
  getVideosFromYoutubeSearch,
} from "@/lib/videos-for-home";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ channel?: string; q?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const { channel: channelParam, q: qParam } = await searchParams;
  const searchQuery =
    typeof qParam === "string" ? qParam.trim() : "";
  const isSearch = searchQuery.length > 0;
  const channelId =
    typeof channelParam === "string" ? channelParam.trim() : "";

  if (!channelId && !isSearch) {
    redirect("/dashboard/discover");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    channels,
    source,
    needsYoutubeScope,
    youtubeError,
  } = await getChannelsForUser();

  const resolvedId =
    channels.length > 0
      ? channelId && channels.some((c) => c.id === channelId)
        ? channelId
        : channels[0]!.id
      : "c1";

  const channel = getChannel(resolvedId) ?? {
    id: resolvedId,
    title: channels.find((c) => c.id === resolvedId)?.title ?? "Select a channel",
  };

  const { videos: list, uploadsError } = isSearch
    ? await getVideosFromYoutubeSearch(searchQuery, source)
    : await getVideosForHome(channel.id, source);

  const signedIn = Boolean(user);
  const searchErrorDetail =
    uploadsError === "search_requires_youtube"
      ? signedIn
        ? "You’re logged in — allow YouTube access (header) so search can use the YouTube API instead of the sample catalog."
        : "Video search needs a Google account with YouTube permission."
      : uploadsError === "missing_provider_token"
        ? signedIn
          ? "You’re logged in — use “Allow YouTube access” in the header so your session gets a Google token."
          : "Sign in with Google (YouTube) to search."
        : uploadsError;

  return (
    <AppShell
      channels={channels}
      activeChannelId={resolvedId}
      suppressSidebarActive={isSearch}
      isAuthenticated={!!user}
    >
      <main className="min-w-0 overflow-x-hidden p-6 px-7 lg:p-7">
        <YoutubeSyncHint
          needsYoutubeScope={needsYoutubeScope}
          youtubeError={youtubeError}
          source={source}
          isSignedIn={signedIn}
        />
        <div className="mb-8">
          <VideoSearchBar
            defaultQuery={searchQuery}
            channelContextId={
              resolvedId.startsWith("UC") ? resolvedId : undefined
            }
          />
        </div>
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isSearch ? `Results for “${searchQuery}”` : channel.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isSearch
              ? source === "youtube"
                ? "YouTube search (opens the video page for transcript & analysis)"
                : signedIn
                  ? "You’re logged in — allow YouTube access in the header to search the real catalog."
                  : "Sample mode — sign in with Google (YouTube) to search"
              : source === "youtube" && resolvedId.startsWith("UC")
                ? "Latest uploads from YouTube"
                : signedIn
                  ? "Sample catalog — allow YouTube access in the header for real subscriptions."
                  : "Sample catalog — sign in with Google (YouTube) for real subs"}
          </p>
        </header>
        {uploadsError ? (
          <p className="mb-4 text-sm text-red-300/90">
            {isSearch
              ? `Search failed: ${searchErrorDetail}`
              : uploadsError === "missing_provider_token"
                ? signedIn
                  ? "You’re logged in — use “Allow YouTube access” in the header to load subscriptions and uploads."
                  : "Sign in with Google (YouTube) to load subscriptions and uploads."
                : "Could not load uploads. Refresh your Google session or check API quota."}
          </p>
        ) : null}
        {!isSearch && list.length === 0 && !uploadsError ? (
          <p className="text-sm text-muted">
            No videos to show for this channel.
          </p>
        ) : isSearch && list.length === 0 && !uploadsError ? (
          <p className="text-sm text-muted">No videos matched your search.</p>
        ) : list.length === 0 ? null : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
