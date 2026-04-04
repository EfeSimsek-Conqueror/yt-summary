"use client";

import { ListPlus } from "lucide-react";
import { useCallback, useRef, useState, useEffect } from "react";
import { usePlaylistOptional } from "./playlist-context";
import type { Video } from "@/lib/types";

type Props = {
  video: Video;
};

export function AddToPlaylistButton({ video }: Props) {
  const playlist = usePlaylistOptional();
  const [showTick, setShowTick] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleAdd = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!playlist) return;
      playlist.addToQueue([video]);
      setShowTick(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setShowTick(false), 1200);
    },
    [playlist, video],
  );

  if (!playlist) return null;

  const alreadyInQueue = playlist.queue.some((v) => v.id === video.id);

  return (
    <button
      type="button"
      onClick={handleAdd}
      className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-black/90"
      aria-label="Add to queue"
      title={alreadyInQueue ? "Already in queue" : "Add to queue"}
    >
      {showTick || alreadyInQueue ? (
        <span className="text-xs font-bold text-emerald-400">✓</span>
      ) : (
        <ListPlus className="h-4 w-4" />
      )}
    </button>
  );
}
