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
        ? "Connect Google for YouTube — your VidSum account is signed in, but search needs a YouTube API token (not the sample catalog)."
        : "Video search needs a Google sign-in with YouTube access (not the sample catalog)."
      : uploadsError === "missing_provider_token"
        ? signedIn
          ? "Connect Google for YouTube — your session has no YouTube token yet."
          : "Sign in with Google (YouTube scope) to search."
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
                  ? "Connect Google for YouTube to search — you’re signed in to VidSum."
                  : "Sample mode — sign in with Google (YouTube) to search"
              : source === "youtube" && resolvedId.startsWith("UC")
                ? "Latest uploads from YouTube"
                : signedIn
                  ? "Sample catalog — connect Google for YouTube to see your real subscriptions."
                  : "Sample catalog (sign in with Google for real subs)"}
          </p>
        </header>
        {uploadsError ? (
          <p className="mb-4 text-sm text-red-300/90">
            {isSearch
              ? `Search failed: ${searchErrorDetail}`
              : uploadsError === "missing_provider_token"
                ? signedIn
                  ? "You’re signed in — use Connect Google for YouTube (header) to load subscriptions and uploads."
                  : "Sign in with Google (YouTube scope) to load subscriptions and uploads."
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
