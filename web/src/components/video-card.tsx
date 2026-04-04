import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import type { Video } from "@/lib/types";
import { formatRelativeDate } from "@/lib/format-relative-date";
import { AddToPlaylistButton } from "@/components/playlist/add-to-playlist-dropdown";

const thumbGradients = [
  "from-slate-600 to-slate-900",
  "from-indigo-600 to-slate-900",
  "from-emerald-700 to-slate-900",
  "from-amber-700 to-slate-900",
  "from-rose-700 to-slate-900",
  "from-violet-600 to-slate-900",
];

function thumbClass(id: string) {
  const i =
    id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    thumbGradients.length;
  return thumbGradients[i];
}

type Props = {
  video: Video;
};

export function VideoCard({ video }: Props) {
  return (
    <article className="overflow-hidden rounded-xl border border-gray-800 bg-zinc-950 transition-colors hover:border-blue-600/40">
      <Link href={`/video/${video.id}`} className="group block">
        <div
          className={
            video.thumbnailUrl
              ? "relative aspect-video overflow-hidden bg-gray-900"
              : `relative aspect-video overflow-hidden bg-gradient-to-br ${thumbClass(video.id)}`
          }
        >
          {video.thumbnailUrl ? (
            <Image
              src={video.thumbnailUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : null}
          <AddToPlaylistButton video={video} />
          <span className="absolute bottom-2 right-2 z-10 rounded bg-black/80 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
            {video.durationLabel}
          </span>
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/15">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              <Play className="h-6 w-6 fill-white text-white" />
            </div>
          </div>
        </div>
        <div className="px-3.5 pb-3.5 pt-3">
          <h2 className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-blue-400">
            {video.title}
          </h2>
          {video.channelTitle || video.publishedAt ? (
            <p className="mb-1.5 text-[11px] font-medium text-muted">
              {video.channelTitle}
              {video.channelTitle && video.publishedAt ? " · " : ""}
              {video.publishedAt ? formatRelativeDate(video.publishedAt) : ""}
            </p>
          ) : null}
          <p className="line-clamp-2 text-xs leading-relaxed text-muted">
            {video.summaryShort}
          </p>
        </div>
      </Link>
    </article>
  );
}
