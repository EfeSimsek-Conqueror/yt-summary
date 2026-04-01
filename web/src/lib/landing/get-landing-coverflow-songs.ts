import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_PREVIEW_START_SEC,
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
  const t = youtubeId.trim();
  if (!t) return t;
  if (t === "b1kbLWvqugk") return "b1kbLwvqugk";
  /** Old Jagger id — hqdefault 404; official video is iEPTlhBmwRg */
  if (t === "sEhJf6OlqIw") return "iEPTlhBmwRg";
  return t;
}

function rowToSong(row: Row): LandingSong {
  const idKey = String(row.id).trim();
  const fb = FALLBACK_BY_ID.get(idKey);
  const ytFromDb = normalizeYoutubeId(String(row.youtube_id ?? ""));
  /** Bundled row wins for playback id when present (DB often lags behind shipped fixes). */
  const youtubeId = fb?.youtubeId ?? ytFromDb;

  const raw = row.cover_url?.trim() || "";
  /**
   * Prefer bundled `albumCover` before DB `cover_url`.
   * Otherwise a stale mzstatic / wrong thumb in Supabase overrides the fix after code changes.
   */
  const merged =
    fb?.albumCover?.trim() || raw || youtubeCoverUrl(youtubeId);
  const albumCover = merged.trim() || youtubeCoverUrl(youtubeId);
  return {
    id: idKey,
    title: row.title,
    artist: row.artist,
    youtubeId,
    albumName: row.album_name ?? undefined,
    year: row.year ?? undefined,
    albumCover,
    previewStartSec:
      fb?.previewStartSec ?? DEFAULT_PREVIEW_START_SEC,
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
