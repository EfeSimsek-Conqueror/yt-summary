import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { VideoDetail } from "@/components/video-detail";
import { getChannelsForUser } from "@/lib/channels-for-user";
import { createClient } from "@/lib/supabase/server";
import { getVideo } from "@/lib/mock-data";
import { fetchVideoById } from "@/lib/youtube/fetch-video-by-id";
import { isLikelyYoutubeVideoId } from "@/lib/youtube/video-id";

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
      >
        <VideoDetail video={mock} />
      </AppShell>
    );
  }

  if (!isLikelyYoutubeVideoId(id)) {
    notFound();
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.provider_token) {
    notFound();
  }

  const fetched = await fetchVideoById(session.provider_token, id);
  if (!fetched.ok) {
    notFound();
  }

  const video = fetched.video;

  return (
    <AppShell
      channels={channels}
      activeChannelId={
        channels.some((c) => c.id === video.channelId)
          ? video.channelId
          : channels[0]?.id ?? video.channelId
      }
      isAuthenticated
    >
      <VideoDetail video={video} />
    </AppShell>
  );
}
