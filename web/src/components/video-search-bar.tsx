"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { parsePlaylistId } from "@/lib/youtube/video-id";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type KeyboardEvent,
} from "react";

type Props = {
  /** Current search query (URL `q`) */
  defaultQuery?: string;
  /** When set, submitted form keeps `channel` in the URL for sidebar context */
  channelContextId?: string;
};

export function VideoSearchBar({
  defaultQuery = "",
  channelContextId,
}: Props) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  const runSuggest = useCallback(async (text: string) => {
    const t = text.trim();
    if (t.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/youtube/search-suggest?q=${encodeURIComponent(t)}`,
      );
      const data: { suggestions?: string[] } = await res.json();
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = query.trim();
    if (t.length < 2) {
      setSuggestions([]);
      return;
    }
    const id = window.setTimeout(() => {
      void runSuggest(query);
    }, 220);
    return () => window.clearTimeout(id);
  }, [query, runSuggest]);

  function goSearch(q: string) {
    const next = q.trim();
    if (!next) return;

    const playlistId = parsePlaylistId(next);
    if (playlistId) {
      router.push(`/dashboard?playlist=${encodeURIComponent(playlistId)}`);
      setOpen(false);
      setActiveIdx(-1);
      return;
    }

    const params = new URLSearchParams();
    if (channelContextId && channelContextId.startsWith("UC")) {
      params.set("channel", channelContextId);
    }
    params.set("q", next);
    router.push(`/dashboard?${params.toString()}`);
    setOpen(false);
    setActiveIdx(-1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) =>
        i < suggestions.length - 1 ? i + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) =>
        i > 0 ? i - 1 : suggestions.length - 1,
      );
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      goSearch(suggestions[activeIdx]!);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  return (
    <form
      action="/dashboard"
      method="get"
      className="mx-auto w-full min-w-0 max-w-4xl"
      role="search"
      onSubmit={() => {
        setOpen(false);
        setActiveIdx(-1);
      }}
    >
      {channelContextId && channelContextId.startsWith("UC") ? (
        <input type="hidden" name="channel" value={channelContextId} />
      ) : null}
      <label className="sr-only" htmlFor="video-search-q">
        Search videos
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-5 top-1/2 z-[1] h-6 w-6 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
        <input
          id="video-search-q"
          name="q"
          type="search"
          placeholder="Paste YouTube URL or search for videos…"
          value={query}
          maxLength={200}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={open && suggestions.length > 0 ? listId : undefined}
          aria-autocomplete="list"
          className="h-14 w-full rounded-xl border border-gray-700 bg-gradient-to-r from-zinc-900 to-zinc-800 py-2 pl-14 pr-[7.5rem] text-base text-white placeholder:text-gray-500 shadow-lg transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIdx(-1);
          }}
          onFocus={() => {
            if (query.trim().length >= 2 && suggestions.length > 0) {
              setOpen(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKeyDown}
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-lg bg-blue-600 px-6 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Search
        </button>

        {open && query.trim().length >= 2 && (suggestions.length > 0 || loading) ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-auto rounded-xl border border-gray-700 bg-zinc-950 py-1 shadow-xl shadow-black/60"
          >
            {loading && suggestions.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-500">Loading…</li>
            ) : null}
            {suggestions.map((s, idx) => (
              <li key={`${s}-${idx}`} role="option" aria-selected={activeIdx === idx}>
                <button
                  type="button"
                  className={`flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm text-gray-200 transition hover:bg-zinc-800 ${
                    activeIdx === idx ? "bg-zinc-800" : ""
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goSearch(s)}
                >
                  <Search className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                  <span className="line-clamp-2">{s}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {defaultQuery ? (
        <div className="mt-3 flex justify-center">
          <a
            href={
              channelContextId && channelContextId.startsWith("UC")
                ? `/dashboard?channel=${encodeURIComponent(channelContextId)}`
                : "/dashboard"
            }
            className="text-sm font-medium text-gray-400 underline-offset-2 hover:text-white hover:underline"
          >
            Clear search
          </a>
        </div>
      ) : (
        <p className="mt-3 text-center text-sm text-gray-500">
          Paste a YouTube URL or type a search — results show in the grid below.
        </p>
      )}
    </form>
  );
}
