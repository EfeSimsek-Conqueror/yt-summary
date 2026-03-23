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

type Props = {
  searchParams: Promise<{ channel?: string; q?: string }>;
};

export default async function Home({ searchParams }: Props) {
  const { channel: channelParam, q: qParam } = await searchParams;
  const searchQuery =
    typeof qParam === "string" ? qParam.trim() : "";
  const isSearch = searchQuery.length > 0;

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
      ? channelParam && channels.some((c) => c.id === channelParam)
        ? channelParam
        : channels[0]!.id
      : "c1";

  const channel = getChannel(resolvedId) ?? {
    id: resolvedId,
    title: channels.find((c) => c.id === resolvedId)?.title ?? "Select a channel",
  };

  const { videos: list, uploadsError } = isSearch
    ? await getVideosFromYoutubeSearch(searchQuery, source)
    : await getVideosForHome(channel.id, source);

  const searchErrorDetail =
    uploadsError === "search_requires_youtube"
      ? "Video search needs a Google sign-in with YouTube access (not the sample catalog)."
      : uploadsError === "missing_provider_token"
        ? "Sign in with Google (YouTube scope) to search."
        : uploadsError;

  return (
    <AppShell
      channels={channels}
      activeChannelId={resolvedId}
      suppressSidebarActive={isSearch}
      isAuthenticated={!!user}
    >
      <main className="p-6 px-7 lg:p-7">
        <YoutubeSyncHint
          needsYoutubeScope={needsYoutubeScope}
          youtubeError={youtubeError}
          source={source}
        />
        <div className="mb-5">
          <VideoSearchBar
            defaultQuery={searchQuery}
            channelContextId={
              resolvedId.startsWith("UC") ? resolvedId : undefined
            }
          />
        </div>
        <header className="mb-5">
          <h1 className="text-[22px] font-semibold tracking-tight">
            {isSearch ? `Results for “${searchQuery}”` : channel.title}
          </h1>
          <p className="text-[13px] text-muted">
            {isSearch
              ? source === "youtube"
                ? "YouTube search (opens the video page for transcript & analysis)"
                : "Sample mode — sign in with YouTube scope to search"
              : source === "youtube" && resolvedId.startsWith("UC")
                ? "Latest uploads from YouTube"
                : "Sample catalog (sign in with YouTube scope for real subs)"}
          </p>
        </header>
        {uploadsError ? (
          <p className="mb-4 text-sm text-red-200/80">
            {isSearch
              ? `Search failed: ${searchErrorDetail}`
              : uploadsError === "missing_provider_token"
                ? "Sign in with Google (YouTube scope) to load subscriptions and uploads."
                : "Could not load uploads. Re-sign in with Google or check API quota."}
          </p>
        ) : null}
        {!isSearch && list.length === 0 && !uploadsError ? (
          <p className="text-sm text-muted">
            No videos to show for this channel.
          </p>
        ) : isSearch && list.length === 0 && !uploadsError ? (
          <p className="text-sm text-muted">No videos matched your search.</p>
        ) : list.length === 0 ? null : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
