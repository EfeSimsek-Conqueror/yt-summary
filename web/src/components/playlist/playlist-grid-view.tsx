"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ListPlus, Play } from "lucide-react";
import { VideoCard } from "@/components/video-card";
import { usePlaylist } from "./playlist-context";
import type { Video } from "@/lib/types";

type Props = {
  playlistId: string;
};

export function PlaylistGridView({ playlistId }: Props) {
  const router = useRouter();
  const { replaceQueue } = usePlaylist();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/youtube/playlist-items?playlistId=${encodeURIComponent(playlistId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(d.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<{ videos: Video[] }>;
      })
      .then((data) => {
        if (!cancelled) setVideos(data.videos ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load playlist");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  function handlePlayAll() {
    if (videos.length === 0) return;
    replaceQueue(videos);
    router.push(`/video/${videos[0]!.id}`);
  }

  function handleAddToQueue() {
    replaceQueue(videos);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading playlist…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-red-300">{error}</p>
        <p className="mt-2 text-xs text-gray-500">
          Make sure you have YouTube access (sign in with Google).
        </p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-400">
        This playlist is empty.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold text-white">
          Playlist — {videos.length} videos
        </h1>
        <button
          type="button"
          onClick={handlePlayAll}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <Play className="h-4 w-4" />
          Play All
        </button>
        <button
          type="button"
          onClick={handleAddToQueue}
          className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          <ListPlus className="h-4 w-4" />
          Add to Queue
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </div>
  );
}
