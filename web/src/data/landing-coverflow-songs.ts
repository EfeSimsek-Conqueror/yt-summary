/** Curated tracks for the landing Cover Flow (YouTube audio + square album art). */
export type LandingSong = {
  id: string;
  title: string;
  artist: string;
  albumCover: string;
  youtubeId: string;
  albumName?: string;
  year?: number;
  /**
   * Where preview playback begins (seconds) — chorus / drop, not the intro.
   * Omit to use {@link DEFAULT_PREVIEW_START_SEC}.
   */
  previewStartSec?: number;
};

/** Fallback when a track has no curated hype timestamp. */
export const DEFAULT_PREVIEW_START_SEC = 48;

/** YouTube thumbnail fallback when no curated cover is available. */
export function youtubeCoverUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

/**
 * Bundled fallback: iTunes 600×600 artwork (square, no Vevo overlay).
 * Same order as DB seed `sort_order`.
 */
export const FALLBACK_LANDING_COVERFLOW_SONGS: LandingSong[] = [
  {
    id: "1",
    title: "Shake It Off",
    artist: "Taylor Swift",
    youtubeId: "nfWlot6h_JM",
    previewStartSec: 45,
    albumName: "1989 (Deluxe Edition)",
    year: 2014,
    albumCover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/a7/98/d8/a798d867-344d-2bf2-fbfe-d2d1412dcef8/14UMDIM03793.rgb.jpg/600x600bb.jpg",
  },
  {
    id: "2",
    title: "Flowers",
    artist: "Miley Cyrus",
    youtubeId: "G7KNmW9a75Y",
    previewStartSec: 42,
    albumName: "Endless Summer Vacation",
    year: 2023,
    albumCover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/8c/67/ff/8c67ff91-31c3-3fef-1884-ce3ec89f3af4/196589946874.jpg/600x600bb.jpg",
  },
  {
    id: "3",
    title: "Unholy",
    artist: "Sam Smith",
    youtubeId: "Uq9gPaIzbe8",
    previewStartSec: 55,
    albumName: "Gloria",
    year: 2023,
    albumCover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/a4/0c/bd/a40cbd9d-bb38-8164-cd30-e107c8c7bb0e/22UMGIM83430.rgb.jpg/600x600bb.jpg",
  },
  {
    id: "4",
    title: "As It Was",
    artist: "Harry Styles",
    youtubeId: "H5v3kku4y6Q",
    previewStartSec: 47,
    albumName: "Harry's House",
    year: 2022,
    albumCover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/2a/19/fb/2a19fb85-2f70-9e44-f2a9-82abe679b88e/886449990061.jpg/600x600bb.jpg",
  },
  {
    id: "5",
    title: "Heat Waves",
    artist: "Glass Animals",
    youtubeId: "mRD0-GxqHVo",
    previewStartSec: 52,
    albumName: "Dreamland",
    year: 2020,
    albumCover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/da/8b/77/da8b7731-6f4f-eacf-5e74-8b23389eefa1/20UMGIM03371.rgb.jpg/600x600bb.jpg",
  },
  {
    id: "6",
    title: "Stay",
    artist: "The Kid LAROI",
    youtubeId: "kTJczUoc26U",
    previewStartSec: 44,
    albumName: "F*CK LOVE 3: OVER YOU",
    year: 2021,
    albumCover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/89/59/6a/89596ab9-fa3c-8d08-4d95-a6450fa2013c/886449400515.jpg/600x600bb.jpg",
  },
  {
    id: "7",
    title: "Industry Baby",
    artist: "Lil Nas X",
    youtubeId: "UTHLKHL_whs",
    previewStartSec: 38,
    albumName: "MONTERO",
    year: 2021,
    albumCover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/f7/16/67/f7166746-6299-5e54-8c7c-9535e941a53e/886449403929.jpg/600x600bb.jpg",
  },
  {
    id: "25",
    title: "Positions",
    artist: "Ariana Grande",
    youtubeId: "tcYodQoapMg",
    previewStartSec: 45,
    albumName: "Positions",
    year: 2020,
    albumCover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/18/75/d5/1875d587-3892-c732-8edb-e864c5a53b5b/21UMGIM11942.rgb.jpg/600x600bb.jpg",
  },
  {
    id: "8",
    title: "Good 4 U",
    artist: "Olivia Rodrigo",
    youtubeId: "gNi_6U5Pm_o",
    previewStartSec: 41,
    albumName: "SOUR",
    year: 2021,
    albumCover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/76/46/48/76464884-0e9c-1951-a3f6-ce02f74c2b19/21UMGIM26093.rgb.jpg/600x600bb.jpg",
  },
  {
    id: "9",
    title: "Levitating",
    artist: "Dua Lipa",
    youtubeId: "TUVcZfQe-Kw",
    previewStartSec: 46,
    albumName: "Future Nostalgia",
    year: 2020,
    albumCover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/600x600bb.jpg",
  },
  {
    id: "10",
    title: "Blinding Lights",
    artist: "The Weeknd",
    youtubeId: "4NRXx6U8ABQ",
    previewStartSec: 50,
    albumName: "After Hours",
    year: 2020,
    albumCover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a6/6e/bf/a66ebf79-5008-8948-b352-a790fc87446b/19UM1IM04638.rgb.jpg/600x600bb.jpg",
  },
  {
    id: "19",
    title: "Moves Like Jagger",
    artist: "Maroon 5 ft. Christina Aguilera",
    /** Official VEVO upload — `sEhJf6OlqIw` thumbnails 404 on i.ytimg.com. */
    youtubeId: "iEPTlhBmwRg",
    /** ~first chorus / “Moves like Jagger” hook (after intro + whistle). */
    previewStartSec: 55,
    albumName: "Hands All Over",
    year: 2011,
    albumCover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/5f/6e/4c/5f6e4c8b-eba6-f722-caf4-c5773dea7fa1/14UMGIM27067.rgb.jpg/600x600bb.jpg",
  },
  {
    id: "20",
    title: "Shivers",
    artist: "Ed Sheeran",
    youtubeId: "Il0S8BoucSA",
    previewStartSec: 45,
    albumName: "=",
    year: 2021,
    albumCover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/c5/d8/c6/c5d8c675-63e3-6632-33db-2401eabe574d/190296491412.jpg/600x600bb.jpg",
  },
  {
    id: "21",
    title: "Uptown Funk",
    artist: "Mark Ronson ft. Bruno Mars",
    youtubeId: "OPf0YbXqDm0",
    previewStartSec: 36,
    albumName: "Uptown Special",
    year: 2014,
    albumCover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/7e/30/c5/7e30c572-aa47-5f7b-c6fd-42d50cd2c56d/886444959797.jpg/600x600bb.jpg",
  },
  {
    id: "22",
    title: "Dynamite",
    artist: "BTS",
    youtubeId: "gdZLi9oWNZg",
    previewStartSec: 52,
    albumName: "BE",
    year: 2020,
    albumCover:
      "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/03/8d/0e/038d0e52-e96d-f386-b8eb-9f77fa013543/195497146918_Cover.jpg/600x600bb.jpg",
  },
];
