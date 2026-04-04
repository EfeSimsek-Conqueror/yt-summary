"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  ListX,
  Play,
  XCircle,
} from "lucide-react";
import { usePlaylist, type PlaylistVideo } from "./playlist-context";
import { useBackgroundAnalysis } from "./use-background-analysis";
import { formatRelativeDate } from "@/lib/format-relative-date";

function StatusBadge({ status }: { status: PlaylistVideo["analysisStatus"] }) {
  switch (status) {
    case "ready":
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />;
    case "analyzing":
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-400" />;
    case "error":
      return <XCircle className="h-4 w-4 shrink-0 text-red-400" />;
    default:
      return <CircleDashed className="h-4 w-4 shrink-0 text-gray-500" />;
  }
}

export function PlaylistSidebar() {
  const { queue, currentVideoId, clearQueue } = usePlaylist();
  useBackgroundAnalysis();

  if (queue.length === 0) return null;

  return (
    <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-gray-800 bg-zinc-950 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">
          Playlist ({queue.length})
        </h2>
        <button
          type="button"
          onClick={clearQueue}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 transition hover:bg-zinc-900 hover:text-white"
        >
          <ListX className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      <nav className="space-y-1">
        {queue.map((v) => {
          const active = v.id === currentVideoId;
          return (
            <Link
              key={v.id}
              href={`/video/${v.id}`}
              className={`flex items-start gap-2.5 rounded-lg px-2 py-2 text-sm transition ${
                active
                  ? "bg-blue-600/15 text-white outline outline-1 outline-blue-500/40"
                  : "text-gray-300 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <div className="relative mt-0.5 h-10 w-[72px] shrink-0 overflow-hidden rounded bg-gray-800">
                {v.thumbnailUrl ? (
                  <Image
                    src={v.thumbnailUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="72px"
                  />
                ) : null}
                {active ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Play className="h-4 w-4 fill-white text-white" />
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-medium leading-snug">
                  {v.title}
                </p>
                <p className="mt-0.5 text-[10px] text-gray-500">
                  {v.durationLabel}
                  {v.publishedAt ? ` · ${formatRelativeDate(v.publishedAt)}` : ""}
                </p>
              </div>
              <StatusBadge status={v.analysisStatus} />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
