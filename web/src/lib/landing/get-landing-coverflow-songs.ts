import { createClient } from "@/lib/supabase/server";
import {
  FALLBACK_LANDING_COVERFLOW_SONGS,
  youtubeCoverUrl,
  type LandingSong,
} from "@/data/landing-coverflow-songs";

type Row = {
  id: string;
  sort_order: number;
  title: string;
  artist: string;
  youtube_id: string;
  album_name: string | null;
  year: number | null;
  cover_url: string;
};

const FALLBACK_BY_ID = new Map(
  FALLBACK_LANDING_COVERFLOW_SONGS.map((s) => [s.id, s]),
);

/** Legacy DB typos — map to working IDs when a row has no bundled fallback entry. */
function normalizeYoutubeId(youtubeId: string): string {
  if (youtubeId === "b1kbLWvqugk") return "b1kbLwvqugk";
  return youtubeId;
}

function rowToSong(row: Row): LandingSong {
  const fb = FALLBACK_BY_ID.get(row.id);
  /** Curated list in code is source of truth for playback IDs (avoids stale Supabase typos). */
  const ytId = fb?.youtubeId ?? normalizeYoutubeId(row.youtube_id);
  const raw = row.cover_url?.trim() || "";
  const isYtThumb = raw.includes("ytimg.com");
  const albumCover = isYtThumb
    ? (fb?.albumCover ?? youtubeCoverUrl(ytId))
    : raw || fb?.albumCover || youtubeCoverUrl(ytId);
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    youtubeId: ytId,
    albumName: row.album_name ?? undefined,
    year: row.year ?? undefined,
    albumCover,
  };
}

/**
 * Loads landing Cover Flow tracks from Supabase (fast, shared for all visitors).
 * Falls back to bundled data if the table is empty or the query fails.
 */
export async function getLandingCoverflowSongs(): Promise<LandingSong[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("landing_coverflow_tracks")
      .select(
        "id, sort_order, title, artist, youtube_id, album_name, year, cover_url",
      )
      .order("sort_order", { ascending: true });

    if (error || !data?.length) {
      return FALLBACK_LANDING_COVERFLOW_SONGS;
    }
    return (data as Row[]).map(rowToSong);
  } catch {
    return FALLBACK_LANDING_COVERFLOW_SONGS;
  }
}
