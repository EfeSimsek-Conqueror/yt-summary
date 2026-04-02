import { ConnectYoutubeCta } from "@/components/connect-youtube-cta";
import { Youtube } from "lucide-react";

type Props = {
  needsYoutubeScope?: boolean;
  youtubeError?: string;
  source: "youtube" | "mock";
  /** When true, copy avoids “sign in” — user is already signed in to VidSum. */
  isSignedIn?: boolean;
};

/**
 * Explains when the sidebar still shows mock data because OAuth lacks YouTube scope.
 * Compact bar when logged in so the page still feels “open” below.
 */
export function YoutubeSyncHint({
  needsYoutubeScope,
  youtubeError,
  source,
  isSignedIn,
}: Props) {
  if (source === "youtube" && !needsYoutubeScope && !youtubeError) {
    return null;
  }

  if (needsYoutubeScope) {
    if (isSignedIn) {
      return (
        <div
          className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          role="region"
          aria-labelledby="yt-connect-title"
        >
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600/30"
              aria-hidden
            >
              <Youtube className="h-5 w-5 text-red-200" />
            </div>
            <div className="min-w-0">
              <h2
                id="yt-connect-title"
                className="text-sm font-semibold text-white"
              >
                One more step: YouTube permission
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-amber-100/85 sm:text-sm">
                You&apos;re logged into VidSum. Tap the button to let Google issue
                a token with{" "}
                <code className="rounded bg-black/30 px-1 py-0.5 text-[0.75rem]">
                  youtube.readonly
                </code>{" "}
                — then this page loads real videos (not samples).
              </p>
            </div>
          </div>
          <ConnectYoutubeCta
            label="Allow YouTube access"
            className="w-full shrink-0 py-2.5 text-sm font-semibold sm:w-auto sm:min-w-[200px]"
          />
        </div>
      );
    }

    return (
      <div
        className="mb-8 rounded-2xl border border-gray-800 bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 px-6 py-8 shadow-xl ring-1 ring-white/[0.06] sm:px-10 sm:py-10"
        role="region"
        aria-labelledby="yt-connect-title-guest"
      >
        <div className="mx-auto flex max-w-lg flex-col items-center text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/30"
            aria-hidden
          >
            <Youtube className="h-6 w-6 text-white" />
          </div>
          <h2
            id="yt-connect-title-guest"
            className="mt-5 text-xl font-semibold tracking-tight text-white"
          >
            Connect YouTube
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            Email sign-in doesn&apos;t include a Google access token. Use the
            button below (or sign out and use &quot;Sign in with Google&quot;)
            so we can call YouTube Data API with{" "}
            <code className="rounded bg-black/40 px-1 py-0.5 text-[0.8rem] text-gray-300">
              youtube.readonly
            </code>
            .
          </p>
          <ConnectYoutubeCta
            label="Connect Google for YouTube"
            className="mt-6 w-full max-w-sm py-3 text-sm font-semibold shadow-lg shadow-blue-500/15"
          />
        </div>
      </div>
    );
  }

  if (youtubeError && source === "mock") {
    return (
      <div className="mb-4 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-3 text-xs text-red-100/90">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <p className="min-w-0 leading-relaxed">
            <strong className="font-semibold">YouTube API:</strong> could not load
            subscriptions.{" "}
            <span className="opacity-80">
              Enable <strong>YouTube Data API v3</strong> in Google Cloud for the
              OAuth client used by Supabase, and check quota.{" "}
              {isSignedIn
                ? "You’re logged in — use Reconnect below to refresh the Google token."
                : "If you use email sign-in, connect Google below."}
            </span>
          </p>
          <ConnectYoutubeCta
            label="Reconnect Google (YouTube)"
            variant="subtle"
          />
        </div>
      </div>
    );
  }

  return null;
}
