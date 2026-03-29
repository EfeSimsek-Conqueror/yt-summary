import { ConnectYoutubeCta } from "@/components/connect-youtube-cta";

type Props = {
  needsYoutubeScope?: boolean;
  youtubeError?: string;
  source: "youtube" | "mock";
};

/**
 * Explains when the sidebar still shows mock data because OAuth lacks YouTube scope.
 */
export function YoutubeSyncHint({
  needsYoutubeScope,
  youtubeError,
  source,
}: Props) {
  if (source === "youtube" && !needsYoutubeScope && !youtubeError) {
    return null;
  }

  if (needsYoutubeScope) {
    return (
      <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-xs text-amber-100/90">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <p className="min-w-0 leading-relaxed">
            <strong className="font-semibold">YouTube isn’t connected yet.</strong>{" "}
            Signing in with email doesn’t give a Google access token. Use{" "}
            <strong>Connect Google for YouTube</strong> (or sign out and &quot;Sign
            in with Google&quot;) so we can call YouTube Data API v3 with{" "}
            <code className="rounded bg-black/30 px-1">youtube.readonly</code>.
          </p>
          <ConnectYoutubeCta className="shrink-0" />
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
              Enable <strong>YouTube Data API v3</strong> in Google Cloud for your
              OAuth client and check quota. If you signed in with email only, connect
              Google below.
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
