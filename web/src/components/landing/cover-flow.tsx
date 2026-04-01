"use client";

import { useEffect, useRef, useState } from "react";
import type { LandingSong } from "@/data/landing-coverflow-songs";
import { useResponsive } from "@/hooks/use-responsive";

function ReflectionComponent({
  song,
  index,
  currentIndex,
  getCover,
}: {
  song: LandingSong;
  index: number;
  currentIndex: number;
  getCover?: (song: LandingSong) => string | null;
}) {
  const albumCover = getCover ? getCover(song) : null;
  if (!albumCover) return null;
  return (
    <div
      className="pointer-events-none absolute left-0 top-full h-full w-full select-none rounded-2xl transition-all duration-500"
      style={{
        backgroundImage: `url(${albumCover})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        transform: "scaleY(-1) translateY(0px)",
        opacity: index === currentIndex ? "0.9" : "0.75",
        maskImage:
          "linear-gradient(to top, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.4) 20%, rgba(255,255,255,0.15) 40%, transparent 60%)",
        WebkitMaskImage:
          "linear-gradient(to top, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.4) 20%, rgba(255,255,255,0.15) 40%, transparent 60%)",
        filter: "blur(0.5px) brightness(0.6) contrast(1.3)",
      }}
    />
  );
}

/** When several covers stack at a point, pick index using horizontal zones so side taps work while center stays on top visually. */
function pickCoverflowIndexFromPoint(
  x: number,
  y: number,
  currentIndex: number,
  songsLength: number,
): number | null {
  if (typeof document === "undefined" || songsLength === 0) return null;
  const stack = document.elementsFromPoint(x, y);
  if (!stack?.length) {
    const el = document.elementFromPoint(x, y);
    const node = el?.closest("[data-coverflow-index]");
    const idxStr = node?.getAttribute("data-coverflow-index");
    if (idxStr == null) return null;
    const idx = parseInt(idxStr, 10);
    return Number.isNaN(idx) || idx < 0 || idx >= songsLength ? null : idx;
  }
  const seen = new Set<number>();
  const unique: number[] = [];
  for (const el of stack) {
    const node = el.closest?.("[data-coverflow-index]");
    if (!node) continue;
    const idxStr = node.getAttribute("data-coverflow-index");
    if (idxStr == null) continue;
    const idx = parseInt(idxStr, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= songsLength) continue;
    if (!seen.has(idx)) {
      seen.add(idx);
      unique.push(idx);
    }
  }
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0];
  const w = window.innerWidth;
  const cx = w / 2;
  const margin = w * 0.14;
  if (x < cx - margin) return Math.min(...unique);
  if (x > cx + margin) return Math.max(...unique);
  if (unique.includes(currentIndex)) return currentIndex;
  return unique.reduce((a, b) =>
    Math.abs(a - currentIndex) <= Math.abs(b - currentIndex) ? a : b,
  );
}

type CoverFlowProps = {
  songs: LandingSong[];
  onSongSelect: (song: LandingSong) => void;
  selectedSong: LandingSong | null;
  getCover?: (song: LandingSong) => string | null;
  isLoading?: (songId: string) => boolean;
};

export function CoverFlow({
  songs,
  onSongSelect,
  selectedSong,
  getCover,
  isLoading,
}: CoverFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.floor(songs.length / 2),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isMobile, albumSize } = useResponsive();
  const lastDragTime = useRef(Date.now());
  const animationRef = useRef<number | undefined>(undefined);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const tapHandledRef = useRef(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (selectedSong) {
      const index = songs.findIndex((song) => song.id === selectedSong.id);
      if (index !== -1) setCurrentIndex(index);
    }
  }, [selectedSong, songs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const newIndex = Math.max(0, currentIndex - 1);
        setCurrentIndex(newIndex);
        onSongSelect(songs[newIndex]);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const newIndex = Math.min(songs.length - 1, currentIndex + 1);
        setCurrentIndex(newIndex);
        onSongSelect(songs[newIndex]);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSongSelect(songs[currentIndex]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, songs, onSongSelect]);

  const handleDragStart = (clientX: number, clientY: number) => {
    tapHandledRef.current = false;
    isDraggingRef.current = true;
    setIsDragging(true);
    setDragStart(clientX);
    setDragOffset(0);
    setVelocity(0);
    lastPointRef.current = { x: clientX, y: clientY };
    lastDragTime.current = Date.now();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    lastPointRef.current = { x: clientX, y: clientY };
    const currentTime = Date.now();
    const deltaTime = currentTime - lastDragTime.current;
    const newOffset = clientX - dragStart;
    const deltaOffset = newOffset - dragOffset;
    setDragOffset(newOffset);
    setVelocity(deltaOffset / Math.max(deltaTime, 1));
    lastDragTime.current = currentTime;
  };

  const handleDragEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    const threshold = 36;
    const velocityThreshold = 0.5;
    const highVelocityThreshold = 2.0;
    let targetIndex = currentIndex;
    const dragDistance = Math.abs(dragOffset);
    const dragVelocity = Math.abs(velocity);

    // Tap / tiny move: choose the album under the pointer (center card no longer steals hits).
    if (dragDistance < 14 && dragVelocity < 0.55) {
      const { x, y } = lastPointRef.current;
      const idx = pickCoverflowIndexFromPoint(x, y, currentIndex, songs.length);
      if (idx != null && songs[idx]) {
        tapHandledRef.current = true;
        setCurrentIndex(idx);
        onSongSelect(songs[idx]);
      }
      setDragOffset(0);
      setVelocity(0);
      return;
    }

    if (dragDistance > threshold || dragVelocity > velocityThreshold) {
      let jumpCount = 1;
      if (dragVelocity > highVelocityThreshold) {
        jumpCount = Math.min(2, Math.ceil(dragVelocity / 1.5));
      }
      if (dragDistance > threshold * 2) {
        jumpCount = Math.max(
          jumpCount,
          Math.floor(dragDistance / (threshold * 1.5)),
        );
      }
      if (dragOffset < 0 || velocity < -velocityThreshold) {
        targetIndex = Math.min(songs.length - 1, currentIndex + jumpCount);
      } else if (dragOffset > 0 || velocity > velocityThreshold) {
        targetIndex = Math.max(0, currentIndex - jumpCount);
      }
    }
    setCurrentIndex(targetIndex);
    onSongSelect(songs[targetIndex]);
    setDragOffset(0);
    setVelocity(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Do not preventDefault — it would suppress click on child albums and break selection.
    handleDragStart(e.clientX, e.clientY);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    handleDragMove(e.clientX, e.clientY);
  };
  const handleMouseUp = () => handleDragEnd();

  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleTouchEnd = () => handleDragEnd();

  const getTransform = (index: number) => {
    const baseOffset = index - currentIndex;
    const offset = baseOffset + (isDragging ? dragOffset / 100 : 0);
    const SPACING = isMobile ? 162 : 248;
    const ROTATION = 52;
    /** Center: positive translateZ + highest z-index = foreground. Sides: slightly negative Z for depth. */
    if (Math.abs(offset) < 0.1) {
      return `translateX(0px) translateZ(88px) rotateY(0deg) scale(1.34)`;
    }
    if (offset < 0) {
      const distance = Math.abs(offset);
      const x = -SPACING * distance;
      const z = -42 * distance;
      const scale = Math.max(0.78, 1.28 - distance * 0.045);
      return `translateX(${x}px) translateZ(${z}px) rotateY(${ROTATION}deg) scale(${scale})`;
    }
    const distance = Math.abs(offset);
    const x = SPACING * distance;
    const z = -42 * distance;
    const scale = Math.max(0.78, 1.28 - distance * 0.045);
    return `translateX(${x}px) translateZ(${z}px) rotateY(-${ROTATION}deg) scale(${scale})`;
  };

  /** Active track on top; neighbors step down so the playing cover reads clearly in front. */
  const getZIndex = (index: number) => {
    const offset = Math.abs(index - currentIndex);
    if (offset === 0) return 5000;
    if (offset === 1) return 3200;
    if (offset === 2) return 2600;
    if (offset === 3) return 2200;
    if (offset === 4) return 1800;
    return Math.max(100, 1600 - offset * 80);
  };

  const getOpacity = (index: number) => {
    const baseOffset = index - currentIndex;
    const offset = Math.abs(
      baseOffset + (isDragging ? dragOffset / 100 : 0),
    );
    if (offset < 0.1) return 1;
    if (offset <= 1) return 1;
    if (offset <= 2) return 1;
    if (offset <= 3) return 0.95;
    if (offset <= 4) return 0.9;
    return Math.max(0.8, 0.9 - (offset - 4) * 0.05);
  };

  if (songs.length === 0) {
    return (
      <div className="text-center text-gray-400">No songs available</div>
    );
  }

  return (
    <div className="relative z-0 mx-auto w-full max-w-7xl">
      <div
        ref={containerRef}
        className="relative flex min-h-[min(52vh,520px)] w-full items-center justify-center overflow-visible select-none"
        style={{
          perspective: "1500px",
          perspectiveOrigin: "center center",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (tapHandledRef.current) {
            tapHandledRef.current = false;
            return;
          }
          const idx = pickCoverflowIndexFromPoint(
            e.clientX,
            e.clientY,
            currentIndex,
            songs.length,
          );
          if (idx == null || !songs[idx]) return;
          setCurrentIndex(idx);
          onSongSelect(songs[idx]);
        }}
      >
        {songs.map((song, index) => (
          <div
            key={song.id}
            data-coverflow-index={index}
            className="absolute cursor-pointer select-none"
            style={{
              transform: getTransform(index),
              zIndex: getZIndex(index),
              opacity: getOpacity(index),
              transformOrigin: "center center",
              transformStyle: "preserve-3d",
              transition: isDragging
                ? "none"
                : "all 400ms cubic-bezier(0.23, 1, 0.32, 1)",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setCurrentIndex(index);
                onSongSelect(song);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div
              className="group relative select-none"
              style={{
                width: `${albumSize}px`,
                height: `${albumSize}px`,
              }}
            >
              {getCover && getCover(song) ? (
                <div
                  className="relative h-full w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15"
                  style={{
                    boxShadow:
                      "0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 12px 40px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(255,255,255,0.08)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- external CDN */}
                  <img
                    src={getCover(song)!}
                    alt={`${song.title} — ${song.artist}`}
                    draggable={false}
                    className="h-full w-full min-h-full min-w-full scale-[1.08] select-none object-cover object-center brightness-[1.02] contrast-[1.03] saturate-[1.08]"
                    style={{ userSelect: "none" }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-black/45 via-transparent to-white/[0.07]"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_36px_rgba(0,0,0,0.4)]"
                    aria-hidden
                  />
                </div>
              ) : (
                <div
                  className="flex h-full w-full select-none items-center justify-center rounded-2xl border border-gray-800/30 bg-gradient-to-br from-gray-950 to-black shadow-2xl"
                  style={{
                    boxShadow:
                      "0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)",
                    userSelect: "none",
                  }}
                >
                  {isLoading && isLoading(song.id) ? (
                    <div className="flex flex-col items-center gap-2 text-white/60">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-gray-400" />
                      <span className="px-2 text-center text-xs">Loading…</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-white/40">
                      <svg
                        className="h-12 w-12"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                      <span className="px-2 text-center text-xs">
                        {song.artist}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 30%, transparent 55%, rgba(0,0,0,0.06) 100%)",
                }}
              />
              <ReflectionComponent
                song={song}
                index={index}
                currentIndex={currentIndex}
                getCover={getCover}
              />
              <div
                className="pointer-events-none absolute left-0 top-full w-full select-none rounded-2xl transition-opacity duration-1000"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 40%, transparent 100%)",
                  transform: "translateY(6px)",
                  opacity: index === currentIndex ? "0.6" : "0.35",
                }}
              />
              {index === currentIndex && (
                <>
                  <div className="absolute inset-0 rounded-2xl border border-white/35 shadow-2xl" />
                  <div className="absolute right-3 top-3 h-2.5 w-2.5 animate-pulse rounded-full bg-white opacity-90 shadow-lg" />
                  <div className="absolute left-1/4 right-1/4 top-0 h-1 rounded-full bg-white/25 blur-sm" />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
