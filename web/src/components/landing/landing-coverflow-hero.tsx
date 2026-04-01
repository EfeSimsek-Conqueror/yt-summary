"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PREVIEW_START_SEC,
  youtubeCoverUrl,
  type LandingSong,
} from "@/data/landing-coverflow-songs";
import { CoverFlow } from "./cover-flow";
import { LandingBackgroundVideo } from "./landing-background-video";
import { LandingPlayer } from "./landing-player";

type Props = {
  songs: LandingSong[];
};

export function LandingCoverflowHero({ songs }: Props) {
  const [selectedSong, setSelectedSong] = useState<LandingSong | null>(null);
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.floor(songs.length / 2),
  );
  const [isPlaying, setIsPlaying] = useState(false);

  const getCover = useCallback(
    (song: LandingSong) =>
      song.albumCover?.trim() || youtubeCoverUrl(song.youtubeId),
    [],
  );
  const isLoadingCover = useCallback(() => false, []);

  useEffect(() => {
    if (songs.length > 0 && !selectedSong) {
      const mid = Math.floor(songs.length / 2);
      setSelectedSong(songs[mid]);
      setCurrentIndex(mid);
    }
  }, [songs, selectedSong]);

  const handleSongSelect = (song: LandingSong) => {
    setSelectedSong(song);
    setIsPlaying(false);
    const idx = songs.findIndex((s) => s.id === song.id);
    if (idx !== -1) setCurrentIndex(idx);
  };

  const handlePrev = () => {
    if (!selectedSong) return;
    const idx = songs.findIndex((s) => s.id === selectedSong.id);
    if (idx <= 0) return;
    handleSongSelect(songs[idx - 1]);
  };

  const handleNext = () => {
    if (!selectedSong) return;
    const idx = songs.findIndex((s) => s.id === selectedSong.id);
    if (idx < 0 || idx >= songs.length - 1) return;
    handleSongSelect(songs[idx + 1]);
  };

  const previewStartSec =
    selectedSong?.previewStartSec ?? DEFAULT_PREVIEW_START_SEC;

  return (
    <section
      className="relative isolate flex min-h-[100dvh] w-full flex-col overflow-x-hidden border-b border-white/5 bg-black"
      aria-label="Music preview"
    >
      {selectedSong && (
        <LandingBackgroundVideo
          youtubeId={selectedSong.youtubeId}
          startSeconds={previewStartSec}
          isPlaying={isPlaying}
          layout="fullscreen"
        />
      )}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-1/3 bg-gradient-to-t from-black via-black/50 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-1/2 max-h-[40vh]"
        style={{
          background:
            "linear-gradient(to top, rgba(255,255,255,0.02) 0%, transparent 100%)",
          transform: "perspective(1000px) rotateX(60deg)",
          transformOrigin: "bottom",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center px-4 pb-10 pt-16 md:px-8 md:pb-14">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center">
          <CoverFlow
            songs={songs}
            onSongSelect={handleSongSelect}
            selectedSong={selectedSong}
            getCover={getCover}
            isLoading={isLoadingCover}
          />

          {selectedSong && (
            <div className="relative z-[60] mt-6 w-full max-w-md md:mt-10">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-5 text-center shadow-2xl shadow-black/40 backdrop-blur-md">
                <h2 className="mb-2 text-xl font-light text-white drop-shadow-lg">
                  {selectedSong.title}
                </h2>
                <p className="mb-1 text-base font-light text-gray-300 drop-shadow-md">
                  {selectedSong.artist}
                </p>
                {selectedSong.albumName && (
                  <p className="mb-4 text-sm font-light text-gray-400 drop-shadow-md">
                    from {selectedSong.albumName}
                    {selectedSong.year ? ` (${selectedSong.year})` : ""}
                  </p>
                )}
                <LandingPlayer
                  key={selectedSong.id}
                  youtubeId={selectedSong.youtubeId}
                  startSeconds={previewStartSec}
                  onPlayingChange={setIsPlaying}
                  canGoPrev={
                    songs.findIndex((s) => s.id === selectedSong.id) > 0
                  }
                  canGoNext={
                    songs.findIndex((s) => s.id === selectedSong.id) <
                    songs.length - 1
                  }
                  onPrev={handlePrev}
                  onNext={handleNext}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
