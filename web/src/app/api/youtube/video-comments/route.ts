import { NextRequest, NextResponse } from "next/server";
import { fetchTopLikedComments } from "@/lib/youtube/fetch-video-comments";
import { isLikelyYoutubeVideoId } from "@/lib/youtube/video-id";

/**
 * GET /api/youtube/video-comments?videoId=...
 * Returns top 10 comments by like count (server-side YouTube Data API).
 * Set YOUTUBE_DATA_API_KEY or GOOGLE_API_KEY in .env.local (YouTube Data API v3 enabled).
 */
export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get("videoId")?.trim() ?? "";
  if (!videoId || !isLikelyYoutubeVideoId(videoId)) {
    return NextResponse.json(
      { comments: [], error: "Invalid video id" },
      { status: 400 },
    );
  }

  /** YouTube Data API key (separate from Gemini / OAuth). Enable YouTube Data API v3 in Google Cloud. */
  const apiKey =
    process.env.YOUTUBE_DATA_API_KEY?.trim() ||
    process.env.YOUTUBE_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_CLOUD_API_KEY?.trim() ||
    "";

  if (!apiKey) {
    return NextResponse.json({
      comments: [],
      error:
        "Top comments need a YouTube Data API key in .env.local (e.g. YOUTUBE_DATA_API_KEY). This is not the same as GEMINI_API_KEY—create a key in Google Cloud with YouTube Data API v3 enabled.",
    });
  }

  const result = await fetchTopLikedComments(videoId, apiKey);
  if (!result.ok) {
    return NextResponse.json({ comments: [], error: result.error });
  }

  return NextResponse.json({ comments: result.comments, error: null });
}
