type Props = {
  /** Current search query (URL `q`) */
  defaultQuery?: string;
  /** When set, submitted form keeps `channel` in the URL for sidebar context */
  channelContextId?: string;
};

/**
 * GET form to `/?q=…` (optional `&channel=…`). Server page runs YouTube search.list.
 */
export function VideoSearchBar({
  defaultQuery = "",
  channelContextId,
}: Props) {
  return (
    <form
      action="/"
      method="get"
      className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-center"
      role="search"
    >
      {channelContextId && channelContextId.startsWith("UC") ? (
        <input type="hidden" name="channel" value={channelContextId} />
      ) : null}
      <label className="sr-only" htmlFor="video-search-q">
        Search YouTube videos
      </label>
      <input
        id="video-search-q"
        name="q"
        type="search"
        placeholder="Search YouTube…"
        defaultValue={defaultQuery}
        maxLength={200}
        className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        autoComplete="off"
      />
      <div className="flex shrink-0 gap-2">
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Search
        </button>
        {defaultQuery ? (
          <a
            href={
              channelContextId && channelContextId.startsWith("UC")
                ? `/?channel=${encodeURIComponent(channelContextId)}`
                : "/"
            }
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted transition hover:bg-raised"
          >
            Clear
          </a>
        ) : null}
      </div>
    </form>
  );
}
