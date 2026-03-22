import Link from "next/link";
import type { Video } from "@/lib/types";
import { getChannel } from "@/lib/mock-data";
import { YoutubeWatchLayout } from "./youtube-watch-layout";

type Props = {
  video: Video;
};

export function VideoDetail({ video }: Props) {
  const channel = getChannel(video.channelId);
  const channelLabel =
    video.channelTitle ?? channel?.title ?? "Channel";

  const backHref =
    video.channelId && video.channelId.length > 0
      ? `/?channel=${encodeURIComponent(video.channelId)}`
      : "/";

  return (
    <main className="p-6 px-7 lg:p-7">
      <Link
        href={backHref}
        className="mb-6 inline-block text-sm text-muted hover:text-accent"
      >
        ← Back to channel
      </Link>

      <YoutubeWatchLayout video={video} channelLabel={channelLabel} />
    </main>
  );
}
