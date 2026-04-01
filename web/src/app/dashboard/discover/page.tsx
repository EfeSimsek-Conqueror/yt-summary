import { AppShell } from "@/components/app-shell";
import { VideoCard } from "@/components/video-card";
import { VideoSearchBar } from "@/components/video-search-bar";
import { YoutubeSyncHint } from "@/components/youtube-sync-hint";
import { DISCOVER_CATEGORIES } from "@/lib/discover-categories";
import { getChannelsForUser } from "@/lib/channels-for-user";
import { getVideosForChannel } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import { getVideosFromYoutubeSearch } from "@/lib/videos-for-home";
import type { Video } from "@/lib/types";

const VIDEOS_PER_ROW = 8;

export default async function DiscoverPage() {
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
    channels.length > 0 ? channels[0]!.id : "c1";
  const mockFallback = getVideosForChannel("c1");

  const rows = await Promise.all(
    DISCOVER_CATEGORIES.map(async (cat) => {
      if (source !== "youtube") {
        return {
          cat,
          videos: mockFallback.slice(0, VIDEOS_PER_ROW),
          uploadsError: "search_requires_youtube" as const,
        };
      }
      const { videos, uploadsError } = await getVideosFromYoutubeSearch(
        cat.query,
        source,
      );
      return {
        cat,
        videos: videos.slice(0, VIDEOS_PER_ROW) as Video[],
        uploadsError,
      };
    }),
  );

  const signedIn = Boolean(user);
  const firstError = rows.find((r) => r.uploadsError)?.uploadsError;
  const searchErrorDetail =
    firstError === "search_requires_youtube"
      ? signedIn
        ? "Connect Google for YouTube — Discover uses search (not the sample catalog)."
        : "Sign in with Google (YouTube scope) to load Discover."
      : firstError === "missing_provider_token"
        ? signedIn
          ? "Connect Google for YouTube — your session has no YouTube token yet."
          : "Sign in with Google (YouTube scope) for Discover."
        : firstError ?? "";

  return (
    <AppShell
      channels={channels}
      activeChannelId={resolvedId}
      suppressSidebarActive
      isAuthenticated={!!user}
      sidebarActiveView="discover"
    >
      <main className="p-6 px-7 pb-16 lg:p-7">
        <YoutubeSyncHint
          needsYoutubeScope={needsYoutubeScope}
          youtubeError={youtubeError}
          source={source}
          isSignedIn={signedIn}
        />

        <div className="mb-8">
          <VideoSearchBar
            defaultQuery=""
            channelContextId={
              resolvedId.startsWith("UC") ? resolvedId : undefined
            }
          />
        </div>

        <header className="mb-10 max-w-3xl">
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            Discover
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">
            Pick a lane — each row is a fresh YouTube search. Open any video for
            transcript, segments, and AI analysis. Categories rotate with what’s
            popular on YouTube; connect Google so search works in your project.
          </p>
        </header>

        {firstError && source === "youtube" ? (
          <p className="mb-8 text-sm text-amber-200/90">
            Some rows may be empty: {searchErrorDetail}
          </p>
        ) : null}

        {source !== "youtube" ? (
          <p className="mb-10 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-3 text-sm text-muted">
            Sample catalog preview below — connect{" "}
            <strong className="text-zinc-300">Google for YouTube</strong> to load
            real Discover results per category.
          </p>
        ) : null}

        <div className="space-y-14">
          {rows.map(({ cat, videos, uploadsError }) => (
            <section
              key={cat.id}
              className="scroll-mt-24"
              aria-labelledby={`discover-${cat.id}`}
            >
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2
                    id={`discover-${cat.id}`}
                    className="text-lg font-semibold tracking-tight text-white md:text-xl"
                  >
                    <span className="mr-2" aria-hidden>
                      {cat.emoji}
                    </span>
                    {cat.title}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-muted">
                    {cat.description}
                  </p>
                </div>
                <a
                  href={`/dashboard?q=${encodeURIComponent(cat.query)}`}
                  className="shrink-0 text-sm font-medium text-blue-400 transition hover:text-blue-300"
                >
                  Search this topic →
                </a>
              </div>

              {uploadsError && source === "youtube" && videos.length === 0 ? (
                <p className="text-sm text-red-300/80">
                  Could not load this row — check YouTube API quota or reconnect
                  Google.
                </p>
              ) : videos.length === 0 ? (
                <p className="text-sm text-muted">No videos for this row yet.</p>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-600">
                  {videos.map((v) => (
                    <div
                      key={`${cat.id}-${v.id}`}
                      className="w-[min(100%,280px)] shrink-0 sm:w-[260px]"
                    >
                      <VideoCard video={v} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
