import Image from "next/image";
import Link from "next/link";
import type { Video } from "@/lib/types";

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
    <article className="overflow-hidden rounded-xl border border-line bg-surface">
      <Link href={`/video/${video.id}`} className="group block">
        <div
          className={
            video.thumbnailUrl
              ? "relative aspect-video overflow-hidden"
              : `relative aspect-video overflow-hidden bg-gradient-to-br ${thumbClass(video.id)}`
          }
        >
          {video.thumbnailUrl ? (
            <Image
              src={video.thumbnailUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : null}
          <span className="absolute bottom-2 right-2 z-10 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {video.durationLabel}
          </span>
        </div>
        <div className="px-3.5 pb-3.5 pt-3">
          <h2 className="mb-2 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-accent">
            {video.title}
          </h2>
          {video.channelTitle ? (
            <p className="mb-1.5 text-[11px] font-medium text-muted">
              {video.channelTitle}
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
