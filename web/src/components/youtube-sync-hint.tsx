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
      <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
        <strong className="font-semibold">For YouTube subscriptions:</strong> sign
        out and use &quot;Sign in with Google&quot; again so the account can grant
        read access to YouTube data. Also ensure the Google Cloud OAuth consent
        screen includes the{" "}
        <code className="rounded bg-black/30 px-1">youtube.readonly</code> scope.
      </div>
    );
  }

  if (youtubeError && source === "mock") {
    return (
      <div className="mb-4 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-100/90">
        YouTube API: could not load the subscription list.{" "}
        <span className="opacity-80">
          (Check that YouTube Data API v3 is enabled and quotas are OK.)
        </span>
      </div>
    );
  }

  return null;
}
