"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Loader2,
  MoreHorizontal,
  Music,
  Pencil,
  Trash2,
  Video,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/format-relative-date";

type Playlist = {
  id: string;
  name: string;
  videoCount: number;
  updatedAt: string;
};

type HistoryItem = {
  id: string;
  videoId: string;
  language: string;
  title: string;
  createdAt: string;
};

export default function LibraryPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [plRes, hRes] = await Promise.all([
      fetch("/api/me/playlists", { credentials: "include" }),
      fetch("/api/me/analysis-history", { credentials: "include" }),
    ]);
    if (plRes.ok) {
      const d = (await plRes.json()) as { playlists: Playlist[] };
      setPlaylists(d.playlists ?? []);
    }
    if (hRes.ok) {
      const d = (await hRes.json()) as { history: HistoryItem[] };
      setHistory(d.history ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    setMenuOpen(null);
    await fetch(`/api/me/playlists/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) return;
    await fetch(`/api/me/playlists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, name: renameValue.trim() } : p,
      ),
    );
    setRenaming(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading library…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-300/80">
          Library
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Your saved playlists and recently analyzed videos.
        </p>
      </header>

      {/* Saved playlists */}
      <section className="overflow-hidden rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/40 to-gray-950/80">
        <div className="border-b border-gray-800/60 px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Music className="h-4 w-4 text-purple-400" />
            Saved playlists
          </h2>
        </div>
        {playlists.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No saved playlists yet. Import a YouTube playlist from the search
            bar and click &quot;Save to Library&quot;.
          </p>
        ) : (
          <ul className="divide-y divide-gray-800/40">
            {playlists.map((pl) => (
              <li
                key={pl.id}
                className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-zinc-900/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 ring-1 ring-purple-500/30">
                  <Video className="h-4 w-4 text-purple-300" />
                </div>
                <div className="min-w-0 flex-1">
                  {renaming === pl.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleRename(pl.id);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="min-w-0 flex-1 rounded border border-gray-700 bg-zinc-900 px-2 py-1 text-sm text-white focus:border-purple-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="rounded bg-purple-600 px-2 py-1 text-xs font-medium text-white"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenaming(null)}
                        className="text-xs text-gray-400"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <p className="truncate text-sm font-medium text-white">
                        {pl.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {pl.videoCount} video{pl.videoCount !== 1 ? "s" : ""}
                      </p>
                    </>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setMenuOpen(menuOpen === pl.id ? null : pl.id)
                    }
                    className="rounded p-1 text-gray-500 transition hover:bg-zinc-800 hover:text-white"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuOpen === pl.id ? (
                    <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-lg border border-gray-700 bg-zinc-900 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(null);
                          setRenameValue(pl.name);
                          setRenaming(pl.id);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-zinc-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(pl.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Analysis history */}
      <section className="overflow-hidden rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/40 to-gray-950/80">
        <div className="border-b border-gray-800/60 px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Clock className="h-4 w-4 text-blue-400" />
            Recent analyses
          </h2>
        </div>
        {history.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No analyses yet. Open a video and run AI analysis.
          </p>
        ) : (
          <ul className="divide-y divide-gray-800/40">
            {history.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/video/${h.videoId}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-zinc-900/40"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 ring-1 ring-blue-500/30">
                    <Video className="h-4 w-4 text-blue-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {h.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {h.language.toUpperCase()} ·{" "}
                      {formatRelativeDate(h.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
