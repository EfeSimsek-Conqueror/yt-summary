import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCaptionTracksForVideo } from "@/lib/youtube/youtube-player-transcript";
import { parseYoutubeVideoId } from "@/lib/youtube/video-id";

/**
 * Returns caption track `baseUrl` list (no timedtext body). The browser may fetch timedtext
 * with the user’s network — useful when the server IP is blocked for timedtext only.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const raw = url.searchParams.get("videoId")?.trim();
  if (!raw) {
    return NextResponse.json({ error: "videoId required" }, { status: 400 });
  }

  const vid = parseYoutubeVideoId(raw) ?? raw;
  if (!/^[\w-]{11}$/.test(vid)) {
    return NextResponse.json({ error: "Invalid videoId" }, { status: 400 });
  }

  const tracks = await getCaptionTracksForVideo(raw);
  return NextResponse.json({ tracks });
}
