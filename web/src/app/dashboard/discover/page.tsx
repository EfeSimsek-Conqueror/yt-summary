import { AppShell } from "@/components/app-shell";
import { VideoCard } from "@/components/video-card";
import { VideoSearchBar } from "@/components/video-search-bar";
import { YoutubeSyncHint } from "@/components/youtube-sync-hint";
import { DISCOVER_CATEGORIES } from "@/lib/discover-categories";
import { getChannelsForUser } from "@/lib/channels-for-user";
import { getVideosForChannel } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import {
  isYoutubeQuotaErrorText,
  sanitizeYoutubeErrorForUi,
} from "@/lib/youtube/format-api-error";
import { getVideosFromYoutubeSearch } from "@/lib/videos-for-home";
import type { Video } from "@/lib/types";
import Link from "next/link";

const VIDEOS_PER_ROW = 12;

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

  const rowsRaw = await Promise.all(
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
  const firstError = rowsRaw.find((r) => r.uploadsError)?.uploadsError;
  const anyRowHasVideos = rowsRaw.some((r) => r.videos.length > 0);
  const useQuotaFallback =
    source === "youtube" &&
    !anyRowHasVideos &&
    Boolean(firstError) &&
    isYoutubeQuotaErrorText(firstError ?? "");

  const rows = useQuotaFallback
    ? rowsRaw.map((r) => ({
        ...r,
        videos: mockFallback.slice(0, VIDEOS_PER_ROW) as Video[],
        uploadsError: undefined as undefined,
      }))
    : rowsRaw;

  const searchErrorDetail =
    firstError === "search_requires_youtube"
      ? signedIn
        ? "You’re logged in — allow YouTube access (banner above) to use real search instead of the sample catalog."
        : "Sign in with Google (YouTube) to load Discover."
      : firstError === "missing_provider_token"
        ? signedIn
          ? "You’re logged in — use “Allow YouTube access” so your session gets a Google token (YouTube Data API)."
          : "Sign in with Google (YouTube) for Discover."
        : sanitizeYoutubeErrorForUi(firstError ?? "");

  const rowUploadsMessage = (uploadsError: string | undefined) => {
    if (!uploadsError) return "";
    if (uploadsError === "missing_provider_token") {
      return signedIn
        ? "You’re logged in — use “Allow YouTube access” so your session gets a Google token."
        : "Sign in with Google (YouTube) for Discover.";
    }
    return sanitizeYoutubeErrorForUi(uploadsError);
  };

  return (
    <AppShell
      channels={channels}
      activeChannelId={resolvedId}
      suppressSidebarActive
      isAuthenticated={!!user}
      sidebarActiveView="discover"
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
            defaultQuery=""
            channelContextId={
              resolvedId.startsWith("UC") ? resolvedId : undefined
            }
          />
        </div>

        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Discover
          </h1>
          <p className="mt-1 text-sm text-muted">
            Same layout as your subscription feed — open any video for transcript
            and AI analysis. Each block is a YouTube search for that topic.
          </p>
        </header>

        {firstError && source === "youtube" && !useQuotaFallback ? (
          <p className="mb-4 text-sm text-amber-200/90">
            Some rows may be empty: {searchErrorDetail}
          </p>
        ) : null}

        {useQuotaFallback ? (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
            YouTube Data API daily quota is used up — showing sample videos below.
            To load live search again, wait for the quota reset or increase it in{" "}
            <a
              href="https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas"
              className="font-medium text-amber-200 underline underline-offset-2 hover:text-white"
              target="_blank"
              rel="noreferrer"
            >
              Google Cloud Console
            </a>
            .
          </p>
        ) : null}

        {source !== "youtube" ? (
          <p className="mb-8 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-3 text-sm text-muted">
            {signedIn ? (
              <>
                You&apos;re logged in — the videos below are{" "}
                <strong className="text-zinc-300">samples</strong>. Allow
                YouTube access in the banner above to load real Discover results.
              </>
            ) : (
              <>
                Sample catalog preview — sign in with Google (YouTube) to load
                real Discover results per category.
              </>
            )}
          </p>
        ) : null}

        <div className="space-y-10">
          {rows.map(({ cat, videos, uploadsError }) => (
            <section
              key={cat.id}
              className="min-w-0"
              aria-labelledby={`discover-${cat.id}`}
            >
              <div className="mb-4 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <h2
                    id={`discover-${cat.id}`}
                    className="text-2xl font-bold tracking-tight text-white"
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
                <Link
                  href={`/dashboard?q=${encodeURIComponent(cat.query)}`}
                  className="shrink-0 text-sm font-medium text-blue-400 transition hover:text-blue-300"
                >
                  Search this topic →
                </Link>
              </div>

              {uploadsError && source === "youtube" && videos.length === 0 ? (
                <p className="text-sm text-red-300/80">
                  {rowUploadsMessage(uploadsError)}
                </p>
              ) : videos.length === 0 ? (
                <p className="text-sm text-muted">No videos for this row yet.</p>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {videos.map((v) => (
                    <VideoCard key={`${cat.id}-${v.id}`} video={v} />
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
