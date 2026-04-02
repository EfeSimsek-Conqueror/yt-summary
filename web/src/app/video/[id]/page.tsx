import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { VideoDetail } from "@/components/video-detail";
import { getResolvedGoogleAccessToken } from "@/lib/google/resolve-google-access-token";
import { getChannelsForUser } from "@/lib/channels-for-user";
import { createClient } from "@/lib/supabase/server";
import { getVideo } from "@/lib/mock-data";
import {
  fetchVideoById,
  fetchVideoByIdWithApiKey,
} from "@/lib/youtube/fetch-video-by-id";
import { isLikelyYoutubeVideoId } from "@/lib/youtube/video-id";
import type { Video } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VideoPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { channels } = await getChannelsForUser();

  const mock = getVideo(id);
  if (mock) {
    return (
      <AppShell
        channels={channels}
        activeChannelId={mock.channelId}
        isAuthenticated={!!user}
        subscriptionSidebar={false}
      >
        <VideoDetail video={mock} />
      </AppShell>
    );
  }

  if (!isLikelyYoutubeVideoId(id)) {
    notFound();
  }

  let video: Video | undefined;

  const accessToken = await getResolvedGoogleAccessToken();
  if (accessToken) {
    const fetched = await fetchVideoById(accessToken, id);
    if (fetched.ok) {
      video = fetched.video;
    }
  }

  if (!video) {
    const fetched = await fetchVideoByIdWithApiKey(id);
    if (fetched.ok) {
      video = fetched.video;
    }
  }

  if (!video) {
    notFound();
  }

  return (
    <AppShell
      channels={channels}
      activeChannelId={
        channels.some((c) => c.id === video.channelId)
          ? video.channelId
          : channels[0]?.id ?? video.channelId
      }
      isAuthenticated={!!user}
      subscriptionSidebar={false}
    >
      <VideoDetail video={video} />
    </AppShell>
  );
}
