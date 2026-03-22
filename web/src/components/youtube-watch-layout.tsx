"use client";

/// <reference types="youtube" />

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Segment, Video } from "@/lib/types";
import {
  MOOD_LABELS,
  moodVisuals,
  normalizeSegmentMood,
} from "@/lib/segment-mood";
import { formatSecondsAsMmSs, segmentStartSeconds } from "@/lib/segment-time";
import { ensureYoutubeIframeApi } from "@/lib/youtube/iframe-api";
import { isLikelyYoutubeVideoId } from "@/lib/youtube/video-id";

const thumbGradients = [
  "from-slate-600 to-slate-900",
  "from-indigo-600 to-slate-900",
  "from-emerald-700 to-slate-900",
];

function thumbClass(id: string) {
  const i =
    id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    thumbGradients.length;
  return thumbGradients[i];
}

type Props = {
  video: Video;
  channelLabel: string;
};

type ContentKind =
  | "tv_episode"
  | "film_recap"
  | "fiction_other"
  | "tutorial"
  | "news"
  | "podcast"
  | "vlog"
  | "review"
  | "other";

const CONTENT_KINDS = new Set<string>([
  "tv_episode",
  "film_recap",
  "fiction_other",
  "tutorial",
  "news",
  "podcast",
  "vlog",
  "review",
  "other",
]);

const FICTION_SPOILER_KINDS: ContentKind[] = [
  "tv_episode",
  "film_recap",
  "fiction_other",
];

function isContentKind(x: string): x is ContentKind {
  return CONTENT_KINDS.has(x);
}

function needsFictionSpoilerGate(
  kind: ContentKind,
  hasSpoilers: boolean,
): boolean {
  return hasSpoilers && FICTION_SPOILER_KINDS.includes(kind);
}

type AnalysisPayload = {
  contentKind: ContentKind;
  hasSpoilers: boolean;
  summaryDetailed: string;
  summaryShort: string;
  revelations: string[];
  keyPoints: string[];
  segments: Segment[];
};

type ApiSegment = {
  start_sec: number;
  end_sec: number;
  title?: string;
  speakers?: string[];
  mood?: string;
  bullets: string[];
};

function mapApiSegments(rows: ApiSegment[]): Segment[] {
  return rows.map((s) => {
    const heading = s.title?.trim() || undefined;
    const speakers =
      Array.isArray(s.speakers) && s.speakers.length > 0
        ? [...new Set(s.speakers.map((n) => n.trim()).filter(Boolean))]
        : undefined;
    return {
      startLabel: formatSecondsAsMmSs(s.start_sec),
      endLabel: formatSecondsAsMmSs(s.end_sec),
      startSec: s.start_sec,
      heading,
      speakers,
      mood: normalizeSegmentMood(s.mood),
      bullets: s.bullets,
    };
  });
}

export function YoutubeWatchLayout({ video, channelLabel }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [spoilersRevealed, setSpoilersRevealed] = useState(false);

  const canEmbed = isLikelyYoutubeVideoId(video.id);

  useEffect(() => {
    setAnalysis(null);
    setAnalysisError(null);
    setAnalysisBusy(false);
    setSpoilersRevealed(false);
  }, [video.id]);

  const segments = analysis?.segments ?? video.segments;
  const summaryShort = analysis?.summaryShort ?? video.summaryShort;

  const preAnalysisHint = canEmbed
    ? analysisBusy
      ? "Generating summary and segments…"
      : "Analysis adds ~250-word recap, key bullet facts, and spoiler-tagged twists when relevant—not the raw transcript."
    : video.transcriptPreview;

  const summaryPanelScrollable = !canEmbed || Boolean(analysis);

  const segmentTimes = segments.map((seg, idx) => ({
    idx,
    sec: segmentStartSeconds(seg),
    seg,
  }));

  useEffect(() => {
    if (!canEmbed || !wrapRef.current) return;

    const el = wrapRef.current;
    const elId = `yt-embed-${video.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    el.id = elId;

    let cancelled = false;
    let ytPlayer: YT.Player | null = null;

    void ensureYoutubeIframeApi().then(() => {
      if (cancelled || !document.getElementById(elId)) return;
      ytPlayer = new YT.Player(elId, {
        videoId: video.id,
        width: "100%",
        height: "100%",
        playerVars: {
          enablejsapi: 1,
          origin:
            typeof window !== "undefined" ? window.location.origin : undefined,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (e) => {
            if (cancelled) return;
            playerRef.current = e.target;
            setPlayerReady(true);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      setPlayerReady(false);
      try {
        ytPlayer?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [video.id, canEmbed]);

  useEffect(() => {
    if (!playerReady) return;
    const id = window.setInterval(() => {
      try {
        const t = playerRef.current?.getCurrentTime();
        if (typeof t === "number") setPlayhead(t);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => window.clearInterval(id);
  }, [playerReady]);

  const seekTo = useCallback((sec: number) => {
    try {
      playerRef.current?.seekTo(sec, true);
      playerRef.current?.playVideo();
    } catch {
      /* ignore */
    }
  }, []);

  const runVideoAnalysis = useCallback(
    async (signal?: AbortSignal) => {
      setAnalysisBusy(true);
      setAnalysisError(null);
      try {
        const res = await fetch("/api/ai/video-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: video.id,
            videoTitle: video.title,
          }),
          signal,
        });
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err =
            typeof (data as { error?: string }).error === "string"
              ? (data as { error: string }).error
              : "Request failed";
          setAnalysisError(err);
          return;
        }
        const d = data as {
          contentKind?: string;
          hasSpoilers?: boolean;
          summaryDetailed?: string;
          summaryShort?: string;
          revelations?: unknown;
          keyPoints?: unknown;
          segments?: ApiSegment[];
        };
        const revelations = Array.isArray(d.revelations)
          ? d.revelations.filter((x): x is string => typeof x === "string")
          : [];
        const keyPoints = Array.isArray(d.keyPoints)
          ? d.keyPoints.filter((x): x is string => typeof x === "string")
          : [];
        const rawKind =
          typeof d.contentKind === "string" ? d.contentKind : "other";
        const contentKind = isContentKind(rawKind) ? rawKind : "other";
        if (
          typeof d.summaryDetailed !== "string" ||
          typeof d.summaryShort !== "string" ||
          typeof d.hasSpoilers !== "boolean" ||
          !Array.isArray(d.segments)
        ) {
          setAnalysisError("Invalid response from server");
          return;
        }
        setSpoilersRevealed(false);
        setAnalysis({
          contentKind,
          hasSpoilers: d.hasSpoilers,
          summaryDetailed: d.summaryDetailed,
          summaryShort: d.summaryShort,
          revelations,
          keyPoints,
          segments: mapApiSegments(d.segments),
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          return;
        }
        setAnalysisError("Network error");
      } finally {
        if (!signal?.aborted) {
          setAnalysisBusy(false);
        }
      }
    },
    [video.id, video.title],
  );

  useEffect(() => {
    if (!canEmbed) return;
    const ac = new AbortController();
    void runVideoAnalysis(ac.signal);
    return () => ac.abort();
  }, [canEmbed, video.id, runVideoAnalysis]);

  let activeSegmentIdx = -1;
  let bestSec = -Infinity;
  for (const { idx, sec } of segmentTimes) {
    if (sec === null) continue;
    if (sec <= playhead && sec >= bestSec) {
      bestSec = sec;
      activeSegmentIdx = idx;
    }
  }

  const canJump = canEmbed && playerReady;

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_380px] lg:items-start">
      <div>
        <div
          className={
            canEmbed
              ? "relative mb-4 aspect-video overflow-hidden rounded-xl border border-line bg-black"
              : video.thumbnailUrl
                ? "relative mb-4 aspect-video overflow-hidden rounded-xl border border-line"
                : `relative mb-4 aspect-video overflow-hidden rounded-xl border border-line bg-gradient-to-br ${thumbClass(video.id)}`
          }
        >
          {canEmbed ? (
            <div ref={wrapRef} className="absolute inset-0 h-full w-full" />
          ) : video.thumbnailUrl ? (
            <Image
              src={video.thumbnailUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          ) : null}
          {!canEmbed ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 text-center text-[11px] text-white/80">
              Embed and chapter jump are available for real YouTube video IDs from
              your feed. This page uses a sample entry without a player.
            </div>
          ) : null}
        </div>

        <h1 className="mb-2 text-xl font-semibold tracking-tight">
          {video.title}
        </h1>
        {summaryShort ? (
          <p className="mb-3 text-sm leading-relaxed text-muted">
            {summaryShort}
          </p>
        ) : null}
        <p className="mb-3 text-sm text-muted">
          {channelLabel} · {video.durationLabel} ·{" "}
          {segments.length === 0
            ? "Pending summary & segment analysis"
            : "Click a segment to jump in the player"}
        </p>

        {canEmbed ? (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={analysisBusy}
              onClick={() => void runVideoAnalysis()}
              className="rounded-lg border border-line bg-raised px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analysisBusy
                ? "Loading captions & analyzing…"
                : analysis
                  ? "Run analysis again"
                  : "Run analysis"}
            </button>
            {analysisError ? (
              <span className="text-sm text-red-600 dark:text-red-400">
                {analysisError}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
            {canEmbed ? "Summary & takeaways" : "Transcript preview"}
          </h2>
          <div
            className={`relative text-sm leading-relaxed ${
              summaryPanelScrollable
                ? "max-h-[min(420px,55vh)] overflow-y-auto pr-1"
                : "max-h-[140px] overflow-hidden"
            }`}
          >
            {!analysis ? (
              <>
                <p className="whitespace-pre-wrap text-muted">
                  {preAnalysisHint}
                </p>
                {!summaryPanelScrollable ? (
                  <div
                    className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-surface to-transparent"
                    aria-hidden
                  />
                ) : null}
              </>
            ) : (
              <div className="space-y-4 text-muted">
                {analysis.hasSpoilers &&
                !needsFictionSpoilerGate(
                  analysis.contentKind,
                  analysis.hasSpoilers,
                ) ? (
                  <p className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-100/95">
                    May contain spoilers for story or gameplay reveals.
                  </p>
                ) : null}

                {analysis.keyPoints.length > 0 ? (
                  <div>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Key points
                    </h3>
                    <ul className="list-disc space-y-1.5 pl-5">
                      {analysis.keyPoints.map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {needsFictionSpoilerGate(
                  analysis.contentKind,
                  analysis.hasSpoilers,
                ) && !spoilersRevealed ? (
                  <div className="rounded-lg border border-amber-500/45 bg-amber-950/35 p-4">
                    <p className="mb-1 text-sm font-semibold text-amber-100">
                      Spoilers ahead
                    </p>
                    <p className="mb-4 text-xs leading-relaxed text-amber-100/88">
                      This looks like a TV, film, or fiction recap. The full
                      summary and revelation list can spoil twists and endings.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSpoilersRevealed(true)}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
                    >
                      Show summary & spoilers
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap">
                      {analysis.summaryDetailed}
                    </p>
                    {analysis.revelations.length > 0 ? (
                      <div className="border-t border-line pt-4">
                        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Spoilers & revelations
                        </h3>
                        <ul className="list-disc space-y-1.5 pl-5">
                          {analysis.revelations.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="rounded-xl border border-line bg-surface p-4"
        aria-label="Segment analysis"
      >
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Segments (max 10)
        </h2>
        {canEmbed ? (
          <p className="mb-3 text-[11px] text-muted">
            {!playerReady
              ? "Loading player…"
              : "Tap a section to seek the video."}
          </p>
        ) : null}

        {segments.length === 0 ? (
          <p className="text-sm text-muted">
            {analysisBusy
              ? "Fetching captions and generating summary…"
              : analysisError
                ? "Analysis did not complete. Fix the error above or retry."
                : "No segments yet. Analysis runs automatically for real videos (needs captions + FAL_KEY)."}
          </p>
        ) : (
          <ul className="space-y-2">
            {segmentTimes.map(({ idx, sec, seg }) => {
              const active = idx === activeSegmentIdx;
              const jumpable = sec !== null && canJump;
              const mood = seg.mood ?? "neutral";
              const v = moodVisuals(mood);
              return (
                <li key={idx}>
                  <button
                    type="button"
                    disabled={!jumpable}
                    onClick={() => sec !== null && seekTo(sec)}
                    className={`w-full rounded-lg border-y border-r border-line border-l-4 py-2.5 pl-3 pr-3 text-left transition ${v.borderLeft} ${
                      active
                        ? `ring-2 ring-offset-2 ring-offset-canvas ${v.activeRing} ${v.activeBg}`
                        : "hover:bg-raised/90"
                    } ${!jumpable ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    title={
                      !canEmbed
                        ? "Requires a YouTube embed"
                        : !playerReady
                          ? "Player loading"
                          : sec === null
                            ? "Invalid timestamp"
                            : `Jump to ${seg.startLabel}`
                    }
                  >
                    <div className="mb-1.5 space-y-1.5">
                      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs leading-snug">
                        <span className="shrink-0 font-bold text-accent">
                          {seg.startLabel} – {seg.endLabel}
                        </span>
                        {seg.heading ? (
                          <span className="min-w-0 font-semibold text-foreground">
                            {seg.heading}
                          </span>
                        ) : null}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${v.chip}`}
                        >
                          {MOOD_LABELS[mood]}
                        </span>
                        {seg.speakers && seg.speakers.length > 0 ? (
                          <p className={`min-w-0 text-[11px] leading-snug ${v.speakerLine}`}>
                            <span className="opacity-85">Who’s talking:</span>{" "}
                            <span
                              className={`font-semibold tracking-tight ${v.speakerNames}`}
                            >
                              {seg.speakers.join(" · ")}
                            </span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted/75">
                            Who’s talking: not identified
                          </p>
                        )}
                      </div>
                    </div>
                    <ul className="list-disc space-y-1 pl-[18px] text-sm leading-relaxed text-muted">
                      {seg.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
