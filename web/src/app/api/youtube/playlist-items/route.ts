import { NextResponse, type NextRequest } from "next/server";
import { getResolvedGoogleAccessToken } from "@/lib/google/resolve-google-access-token";
import { fetchPlaylistItems } from "@/lib/youtube/fetch-playlist-items";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const playlistId = request.nextUrl.searchParams.get("playlistId")?.trim();
  if (!playlistId) {
    return NextResponse.json(
      { error: "Missing playlistId query parameter" },
      { status: 400 },
    );
  }

  const accessToken = await getResolvedGoogleAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: "YouTube access not available. Sign in with Google first." },
      { status: 401 },
    );
  }

  const result = await fetchPlaylistItems(accessToken, playlistId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    videos: result.videos,
    playlistTitle: result.playlistTitle,
  });
}
