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
    return (
      <div
        className="mb-8 rounded-2xl border border-gray-800 bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 px-6 py-8 shadow-xl ring-1 ring-white/[0.06] sm:px-10 sm:py-10"
        role="region"
        aria-labelledby="yt-connect-title"
      >
        <div className="mx-auto flex max-w-lg flex-col items-center text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/30"
            aria-hidden
          >
            <Youtube className="h-6 w-6 text-white" />
          </div>
          <h2
            id="yt-connect-title"
            className="mt-5 text-xl font-semibold tracking-tight text-white"
          >
            Connect YouTube
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            {isSignedIn ? (
              <>
                You&apos;re signed in to VidSum. Link Google with YouTube access
                so we can call YouTube Data API with{" "}
                <code className="rounded bg-black/40 px-1 py-0.5 text-[0.8rem] text-gray-300">
                  youtube.readonly
                </code>{" "}
                — same scopes as a fresh &quot;Sign in with Google&quot; from
                the header.
              </>
            ) : (
              <>
                Email sign-in doesn&apos;t include a Google access token. Use
                the button below (or sign out and use &quot;Sign in with
                Google&quot;) so we can call YouTube Data API with{" "}
                <code className="rounded bg-black/40 px-1 py-0.5 text-[0.8rem] text-gray-300">
                  youtube.readonly
                </code>
                .
              </>
            )}
          </p>
          <ConnectYoutubeCta className="mt-6 w-full max-w-sm py-3 text-sm font-semibold shadow-lg shadow-blue-500/15" />
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
                ? "Then use Reconnect below if the token needs a refresh."
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
