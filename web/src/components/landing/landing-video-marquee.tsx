"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { LandingSong } from "@/data/landing-coverflow-songs";

type Props = {
  songs: LandingSong[];
  isVisible?: boolean;
};

export function LandingVideoMarquee({ songs, isVisible = true }: Props) {
  if (songs.length === 0) return null;

  const loop = [...songs, ...songs];

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 16 }}
        transition={{ duration: 0.6, delay: 1.75 }}
        className="mb-10 text-center"
      >
        <h2 className="mb-3 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
          Analyze your favorite music videos
        </h2>
        <p className="mx-auto max-w-2xl text-base text-gray-400 md:text-lg">
          From Taylor Swift to The Weeknd — our AI works with any content
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.6, delay: 1.85 }}
        className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden py-2"
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-black to-transparent md:w-24"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-black to-transparent md:w-24"
          aria-hidden
        />

        <div
          className="flex w-max gap-4 md:gap-6 motion-reduce:animate-none animate-landing-marquee pr-4 md:pr-6"
          style={{ animationDuration: "55s" }}
        >
          {loop.map((song, i) => (
            <article
              key={`${song.id}-${i}`}
              className="relative h-[min(52vw,320px)] w-[min(42vw,220px)] shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/50 md:h-[340px] md:w-64"
            >
              <Image
                src={song.albumCover}
                alt={`${song.title} — ${song.artist}`}
                fill
                sizes="(max-width:768px) 42vw, 256px"
                className="object-cover"
                draggable={false}
                priority={i < 4}
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent"
                aria-hidden
              />
              <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                <p className="text-lg font-semibold leading-tight text-white drop-shadow-md md:text-xl">
                  {song.title}
                </p>
                <p className="mt-1 text-sm font-light text-white/85 md:text-base">
                  {song.artist}
                </p>
              </div>
            </article>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
