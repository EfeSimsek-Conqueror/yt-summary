"use client";

/// <reference types="youtube" />

import Image from "next/image";
import { RotateCw, ThumbsUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { YoutubeIframePlayer } from "@/components/youtube-iframe-player";
import { VideoAssistantChat } from "@/components/video-assistant-chat";
import { YoutubeSummaryTakeawaysPanel } from "@/components/youtube-summary-takeaways-panel";
import type {
  AnalysisHypeMoment,
  AnalysisPayload,
  Segment,
  Video,
} from "@/lib/types";
import {
  MOOD_LABELS,
  moodVisuals,
  normalizeSegmentMood,
} from "@/lib/segment-mood";
import { formatSecondsAsMmSs, segmentStartSeconds } from "@/lib/segment-time";
import { isLikelyYoutubeVideoId } from "@/lib/youtube/video-id";
import { parseDurationLabelToSeconds } from "@/lib/youtube/iso-duration";
import {
  shouldRetryVideoAnalysisWithBrowserTranscript,
  tryPlainTranscriptFromBrowserCaptionFetch,
} from "@/lib/youtube/client-transcript-fallback";

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

/** Explains why segments are empty when /api/ai/video-analysis failed. */
function segmentAnalysisBlockedReason(error: string): string {
  if (error.includes("could not access speech")) {
    return "AI could not read speech from this video (blocked, no speech, or model limits). Try another video or run analysis again later.";
  }
  if (
    error.includes("Captions are disabled") ||
    error.includes("Could not load captions from YouTube") ||
    error.includes("Caption fetch failed") ||
    error.includes("Automatic caption fetch failed") ||
    error.includes("YouTube often does not expose caption data") ||
    error.includes("Captions are not available to our server") ||
    error.includes("Show transcript")
  ) {
    return "YouTube may not expose captions to this server (the in-app player can still show subtitles). Try again in a few minutes or another video.";
  }
  if (error.includes("No captions available")) {
    return "No caption text was returned for this video. Try another video or refresh the page.";
  }
  if (error.includes("Transcript is empty")) {
    return "The transcript came back empty. Refresh the page or pick a different video.";
  }
  if (
    error.includes("rate limit") ||
    error.includes("rate-limiting") ||
    error.includes("Limiting requests") ||
    error.includes("try again later")
  ) {
    return "YouTube is throttling the server. Wait several minutes. Don’t hammer Run analysis — the same video’s captions are cached briefly after a success.";
  }
  return `${error} Retry from the segment panel or refresh the page.`;
}

type Props = {
  video: Video;
  channelLabel: string;
};

type ContentKind = AnalysisPayload["contentKind"];

const CONTENT_KINDS = new Set<string>([
  "tv_episode",
  "film_recap",
  "fiction_other",
  "tutorial",
  "news",
  "podcast",
  "vlog",
  "review",
  "music",
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

type ApiSegment = {
  start_sec: number;
  end_sec: number;
  title?: string;
  speakers?: string[];
  mood?: string;
  bullets: string[];
};

function mapApiHypeMoments(rows: unknown): AnalysisHypeMoment[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  const out: AnalysisHypeMoment[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const start =
      typeof o.start_sec === "number"
        ? o.start_sec
        : Number(o.start_sec);
    if (!Number.isFinite(start) || start < 0) continue;
    const endRaw = o.end_sec;
    const endNum =
      endRaw === undefined
        ? undefined
        : typeof endRaw === "number"
          ? endRaw
          : Number(endRaw);
    const endSec =
      endNum !== undefined &&
      Number.isFinite(endNum) &&
      endNum >= start
        ? endNum
        : undefined;
    const label =
      typeof o.label === "string" && o.label.trim()
        ? o.label.trim()
        : undefined;
    out.push({ startSec: start, endSec: endSec, label });
  }
  return out;
}

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
  const playerRef = useRef<YT.Player | null>(null);
  /** YouTube watch URLs run server-side analysis; start in “pending” so the segment panel never flashes empty copy before the first effect. */
  const canEmbed = isLikelyYoutubeVideoId(video.id);
  /** loading = waiting for API or onReady; ready = can seek; error/timeout = embed failed or stuck */
  const [playerPhase, setPlayerPhase] = useState<
    "loading" | "ready" | "error" | "timeout"
  >("loading");
  const playerReady = playerPhase === "ready";
  const [playhead, setPlayhead] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null);
  const [analysisBusy, setAnalysisBusy] = useState(() => canEmbed);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [spoilersRevealed, setSpoilersRevealed] = useState(false);
  /** Bumps to destroy/recreate the YT.Player (e.g. after timeout). */
  const [playerRetryKey, setPlayerRetryKey] = useState(0);
  /**
   * When the IFrame API player fails or is slow, show a plain youtube.com/embed iframe
   * so the video still plays (segment seek needs the API player).
   */
  const [embedFallback, setEmbedFallback] = useState(false);
  const [topComments, setTopComments] = useState<
    Array<{ author: string; text: string; likeCount: number }>
  >([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  /** Fullscreen: left 25% segments, right 75% player (summary stays on page). */
  const watchStageRef = useRef<HTMLDivElement>(null);
  const [watchFullscreen, setWatchFullscreen] = useState(false);
  /** Dismisses stale `analysisBusy` when a newer run supersedes or aborts an older one. */
  const analysisRunGenRef = useRef(0);
  /** In-flight POST /api/ai/video-analysis — aborted on segment reload or video change. */
  const analysisAbortRef = useRef<AbortController | null>(null);
  /** Start time for estimated progress (API does not stream real %). */
  const analysisProgressStartedRef = useRef<number>(0);
  const [analysisProgressPct, setAnalysisProgressPct] = useState(0);
  /** True after ~22s so we don't pretend we're stuck at one fake %. */
  const [analysisProgressSlow, setAnalysisProgressSlow] = useState(false);
  /** Optional pasted transcript when YouTube won’t serve captions to the server (API: transcriptPlain, min 400 chars). */

  useEffect(() => {
    const sync = () => {
      const el = watchStageRef.current;
      const fs = document.fullscreenElement;
      const webFs = (
        document as Document & { webkitFullscreenElement?: Element | null }
      ).webkitFullscreenElement;
      setWatchFullscreen(Boolean(el && (fs === el || webFs === el)));
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const toggleWatchFullscreen = useCallback(() => {
    const el = watchStageRef.current;
    if (!el) return;
    const fs = document.fullscreenElement;
    const webFs = (
      document as Document & { webkitFullscreenElement?: Element | null }
    ).webkitFullscreenElement;
    if (fs === el || webFs === el) {
      if (document.exitFullscreen) void document.exitFullscreen();
      else
        (document as Document & { webkitExitFullscreen?: () => void })
          .webkitExitFullscreen?.();
      return;
    }
    if (el.requestFullscreen) void el.requestFullscreen();
    else
      (el as HTMLElement & { webkitRequestFullscreen?: () => void })
        .webkitRequestFullscreen?.();
  }, []);

  useEffect(() => {
    analysisRunGenRef.current = 0;
    setAnalysis(null);
    setAnalysisError(null);
    /** Pending analysis for embeddable videos — avoids “No segments yet” while the next run is scheduled. */
    setAnalysisBusy(canEmbed);
    setSpoilersRevealed(false);
    setPlayerRetryKey(0);
    setEmbedFallback(false);
    setPlayerPhase("loading");
    setPlayhead(0);
    playerRef.current = null;
    setWatchFullscreen(false);
    if (typeof document !== "undefined" && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }, [video.id, canEmbed]);

  /** Prefer AI analysis segments; while analysis is running, ignore mock `video.segments` so the loading bar shows. */
  const analysisSegments = analysis?.segments;
  const hasAnalysisSegments =
    Array.isArray(analysisSegments) && analysisSegments.length > 0;
  const segments = hasAnalysisSegments
    ? analysisSegments
    : analysisBusy
      ? []
      : video.segments;
  const summaryShort = analysis?.summaryShort ?? video.summaryShort;

  const preAnalysisHint = canEmbed
    ? analysisBusy
      ? "Generating summary and segments…"
      : "The server loads timed captions when possible, then runs analysis. The text shown here before you run analysis is the video description, not subtitles."
    : video.transcriptPreview;

  const summaryPanelScrollable = !canEmbed || Boolean(analysis);

  const segmentTimes = segments.map((seg, idx) => ({
    idx,
    sec: segmentStartSeconds(seg),
    seg,
  }));

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

  /**
   * Fake progress only (API has no streaming %). Cap ~90% early, then crawl toward 98%
   * so long transcript retries don't look "frozen at 95%".
   */
  useEffect(() => {
    if (!analysisBusy) {
      setAnalysisProgressPct(0);
      setAnalysisProgressSlow(false);
      return;
    }
    analysisProgressStartedRef.current = Date.now();
    setAnalysisProgressPct(0);
    setAnalysisProgressSlow(false);
    const tick = () => {
      const elapsedSec =
        (Date.now() - analysisProgressStartedRef.current) / 1000;
      setAnalysisProgressSlow(elapsedSec > 22);
      let pct: number;
      if (elapsedSec < 40) {
        pct = Math.min(
          90,
          Math.floor(100 * (1 - Math.exp(-elapsedSec / 24))),
        );
      } else {
        pct = Math.min(98, 90 + Math.floor((elapsedSec - 40) / 12));
      }
      setAnalysisProgressPct(pct);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => clearInterval(id);
  }, [analysisBusy]);

  const runVideoAnalysis = useCallback(
    async (signal?: AbortSignal) => {
      const gen = ++analysisRunGenRef.current;
      setAnalysisBusy(true);
      setAnalysisError(null);
      try {
        const durationSec = parseDurationLabelToSeconds(video.durationLabel);
        const bodyBase = {
          videoId: video.id,
          videoTitle: video.title,
          ...(durationSec != null ? { durationSec } : {}),
          durationLabel: video.durationLabel,
        };

        let res = await fetch("/api/ai/video-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyBase),
          signal,
        });
        let data: unknown = await res.json().catch(() => ({}));

        if (!res.ok) {
          const errFirst =
            typeof (data as { error?: string }).error === "string"
              ? (data as { error: string }).error
              : "Request failed";
          if (
            shouldRetryVideoAnalysisWithBrowserTranscript(res.status, errFirst)
          ) {
            const browserPlain = await tryPlainTranscriptFromBrowserCaptionFetch(
              video.id,
              signal,
            );
            if (browserPlain) {
              res = await fetch("/api/ai/video-analysis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...bodyBase,
                  transcriptPlain: browserPlain,
                }),
                signal,
              });
              data = await res.json().catch(() => ({}));
            }
          }
        }

        if (!res.ok) {
          const payload = data as { error?: string; message?: string };
          if (res.status === 402) {
            const msg =
              typeof payload.message === "string"
                ? payload.message
                : typeof payload.error === "string"
                  ? payload.error
                  : "Not enough credits to analyze this video.";
            setAnalysisError(msg);
            return;
          }
          const err =
            typeof payload.error === "string"
              ? payload.error
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
          keyMoments?: unknown;
          segments?: ApiSegment[];
          hypeMoments?: unknown;
          usedVisualFallback?: boolean;
          transcriptDensityScore?: number | null;
          creditsRemaining?: number;
          creditsCharged?: number;
        };
        const revelations = Array.isArray(d.revelations)
          ? d.revelations.filter((x): x is string => typeof x === "string")
          : [];
        const keyPoints = Array.isArray(d.keyPoints)
          ? d.keyPoints.filter((x): x is string => typeof x === "string")
          : [];
        const keyMoments = Array.isArray(d.keyMoments)
          ? d.keyMoments
              .filter((x): x is string => typeof x === "string")
              .slice(0, 5)
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
          keyMoments,
          segments: mapApiSegments(d.segments),
          hypeMoments: mapApiHypeMoments(d.hypeMoments),
          usedVisualFallback: Boolean(d.usedVisualFallback),
          transcriptDensityScore:
            typeof d.transcriptDensityScore === "number"
              ? d.transcriptDensityScore
              : d.transcriptDensityScore === null
                ? null
                : undefined,
        });
        if (typeof d.creditsRemaining === "number") {
          window.dispatchEvent(
            new CustomEvent("vidsum-credits-updated", {
              detail: { remaining: d.creditsRemaining },
            }),
          );
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          return;
        }
        setAnalysisError("Network error");
      } finally {
        if (gen === analysisRunGenRef.current) {
          setAnalysisBusy(false);
        }
      }
    },
    [video.id, video.title, video.durationLabel],
  );

  const retrySegmentAnalysis = useCallback(() => {
    analysisAbortRef.current?.abort();
    const ac = new AbortController();
    analysisAbortRef.current = ac;
    void runVideoAnalysis(ac.signal);
  }, [runVideoAnalysis]);

  useEffect(() => {
    if (!canEmbed) return;
    const ac = new AbortController();
    analysisAbortRef.current = ac;
    void runVideoAnalysis(ac.signal);
    return () => {
      ac.abort();
    };
  }, [canEmbed, video.id, runVideoAnalysis]);

  useEffect(() => {
    if (!canEmbed) {
      setTopComments([]);
      setCommentsError(null);
      setCommentsLoading(false);
      return;
    }
    let cancelled = false;
    setCommentsLoading(true);
    setCommentsError(null);
    fetch(`/api/youtube/video-comments?videoId=${encodeURIComponent(video.id)}`)
      .then((r) => r.json())
      .then(
        (data: {
          comments?: Array<{
            author?: string;
            text?: string;
            likeCount?: number;
          }>;
          error?: string | null;
        }) => {
          if (cancelled) return;
          const raw = Array.isArray(data.comments) ? data.comments : [];
          const comments = raw
            .filter(
              (c): c is { author: string; text: string; likeCount: number } =>
                !!c &&
                typeof c.author === "string" &&
                typeof c.text === "string" &&
                typeof c.likeCount === "number",
            )
            .slice(0, 10);
          setTopComments(comments);
          setCommentsError(
            typeof data.error === "string" && data.error
              ? data.error
              : null,
          );
        },
      )
      .catch(() => {
        if (!cancelled) setCommentsError("Could not load comments");
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canEmbed, video.id]);

  let activeSegmentIdx = -1;
  let bestSec = -Infinity;
  for (const { idx, sec } of segmentTimes) {
    if (sec === null) continue;
    if (sec <= playhead && sec >= bestSec) {
      bestSec = sec;
      activeSegmentIdx = idx;
    }
  }

  let activeHypeIdx = -1;
  const hypeList = analysis?.hypeMoments;
  if (hypeList && hypeList.length > 0) {
    for (let i = 0; i < hypeList.length; i++) {
      const h = hypeList[i];
      const windowEnd = h.endSec ?? h.startSec + 3;
      if (playhead >= h.startSec && playhead <= windowEnd) {
        activeHypeIdx = i;
        break;
      }
    }
  }

  /** Segment/hype seek needs the JS API player; simple iframe embed cannot seek programmatically. */
  const canJump = canEmbed && playerReady && !embedFallback;

  const youtubeWatchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
  const youtubeEmbedSrc = `https://www.youtube.com/embed/${encodeURIComponent(video.id)}?rel=0&modestbranding=1&playsinline=1`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="min-w-0 flex flex-col gap-3">
        <div
          ref={watchStageRef}
          className={
            watchFullscreen
              ? "relative grid min-h-0 w-full grid-cols-1 gap-3 bg-black p-3 sm:grid-cols-[25%_minmax(0,1fr)] sm:gap-4"
              : "grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start"
          }
        >
      <aside
        className={`order-2 min-w-0 rounded-xl border border-line bg-surface p-4 lg:sticky lg:top-16 lg:order-none lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto ${
          watchFullscreen
            ? "min-h-0 overflow-y-auto sm:max-h-[100vh] sm:border-r sm:border-line/30 sm:pr-2"
            : ""
        }`}
        aria-label="Segment analysis"
      >
        {watchFullscreen ? (
          <span className="sr-only">Segments — tap to seek</span>
        ) : (
          <>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Segments (max 10)
        </h2>
        {canEmbed ? (
          <p className="mb-3 text-[11px] text-muted">
            {embedFallback
              ? "Simple embed is active—segment seek needs Retry (interactive player)."
              : playerPhase === "ready"
                ? "Tap a section to seek the video."
                : "Loading player…"}
          </p>
        ) : null}
          </>
        )}

            {analysisBusy && !hasAnalysisSegments ? (
              <div
                className="cursor-wait space-y-2"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-sm text-muted">
                    Loading captions, then generating summary…
                  </p>
                  <button
                    type="button"
                    onClick={() => retrySegmentAnalysis()}
                    className="shrink-0 cursor-pointer rounded-md border border-line bg-raised p-1.5 text-muted transition hover:bg-surface hover:text-foreground"
                    aria-label="Retry segment analysis"
                    title="Retry segment analysis"
                  >
                    <RotateCw className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div
                  className="space-y-1"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={analysisProgressPct}
                  aria-label="Estimated analysis progress"
                >
                  <div className="h-2.5 w-full overflow-hidden rounded-full border border-line bg-white/10">
                    <div
                      className="h-full min-h-[6px] rounded-full bg-accent shadow-[0_0_12px_rgba(59,130,246,0.35)] transition-[width] duration-300 ease-out"
                      style={{ width: `${analysisProgressPct}%` }}
                    />
                  </div>
                  <p
                    className="text-[11px] tabular-nums leading-tight text-muted"
                    title="Approximate progress based on elapsed time; the API does not stream real percentages."
                  >
                    <span className="font-medium text-foreground/90">
                      {analysisProgressPct}%
                    </span>
                    <span className="opacity-75"> · estimated</span>
                  </p>
                  {analysisProgressSlow ? (
                    <p className="text-[11px] leading-snug text-muted">
                      Still working — fetching captions or retrying can take a
                      while. If YouTube rate-limits the server, you’ll get an
                      error you can retry after a few minutes.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : !hasAnalysisSegments && segments.length === 0 ? (
              <p className="text-sm text-muted">
                {analysisError
                  ? segmentAnalysisBlockedReason(analysisError)
                  : canEmbed
                    ? "Segments will appear here when analysis finishes (captions → summary via Fal). If this stays empty, check FAL_KEY and retry."
                    : "No segments for this catalog video."}
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
                            : embedFallback
                              ? "Retry interactive player to enable seek"
                              : !playerReady
                                ? playerPhase === "loading"
                                  ? "Player loading"
                                  : "Seek unavailable until the player loads"
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
            <div className="mt-5">
              {analysis ? (
                <VideoAssistantChat
                  key={video.id}
                  videoId={video.id}
                  videoTitle={video.title}
                  analysis={analysis}
                  canSeek={canJump}
                  onSeek={seekTo}
                  formatSecondsAsMmSs={formatSecondsAsMmSs}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-line/70 bg-surface/40 px-3 py-3 text-[11px] leading-relaxed text-muted">
                  After analysis finishes, Video AI chat appears here — ask to jump
                  to hype moments, goals, segments, or anything about this video.
                </div>
              )}
            </div>
      </aside>

      <div className="order-1 min-w-0 space-y-6 lg:order-none">
        <div className="min-w-0 space-y-3">
              <div
                className={
                  canEmbed
                    ? "relative aspect-video overflow-hidden rounded-xl border border-line bg-black"
                    : video.thumbnailUrl
                      ? "relative aspect-video overflow-hidden rounded-xl border border-line"
                      : `relative aspect-video overflow-hidden rounded-xl border border-line bg-gradient-to-br ${thumbClass(video.id)}`
                }
              >
          {canEmbed && embedFallback ? (
            <iframe
              className="absolute inset-0 h-full w-full border-0"
              src={youtubeEmbedSrc}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : canEmbed ? (
            <YoutubeIframePlayer
              videoId={video.id}
              retryKey={playerRetryKey}
              onReady={(p) => {
                playerRef.current = p;
                setPlayerPhase("ready");
              }}
              onTimeout={() => {
                setPlayerPhase((prev) =>
                  prev === "loading" ? "timeout" : prev,
                );
                setEmbedFallback(true);
              }}
              onError={() => {
                setPlayerPhase("error");
                setEmbedFallback(true);
              }}
            />
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

        {canEmbed && embedFallback ? (
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>
              Playing the video with a simple embed (no segment jump). Use
              Retry for the full player.
            </span>
            <button
              type="button"
              onClick={() => {
                setEmbedFallback(false);
                setPlayerRetryKey((k) => k + 1);
                setPlayerPhase("loading");
              }}
              className="font-semibold text-accent underline decoration-accent/50 underline-offset-2 hover:decoration-accent"
            >
              Retry interactive player
            </button>
            <a
              href={youtubeWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent underline decoration-accent/50 underline-offset-2"
            >
              Open on YouTube
            </a>
          </div>
        ) : null}
        </div>

        {!watchFullscreen ? (
          <>
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
            ? analysisError
              ? "Summary unavailable (see error below)"
              : analysisBusy
                ? "Generating summary & segments…"
                : "Pending summary & segment analysis"
            : embedFallback
              ? "Video plays above; segment jump needs Retry (interactive player)"
              : "Click a segment to jump in the player"}
        </p>

        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
            Top comments by likes
          </h2>
          {!canEmbed ? (
            <p className="text-sm text-muted">
              Comments appear for real YouTube videos when the Data API key is
              set.
            </p>
          ) : commentsLoading ? (
            <p className="text-sm text-muted">Loading comments…</p>
          ) : topComments.length === 0 ? (
            <p className="text-sm text-muted">
              {commentsError ??
                "No comments loaded (comments disabled, API quota, or add YOUTUBE_DATA_API_KEY in .env.local—this is separate from GEMINI_API_KEY)."}
            </p>
          ) : (
            <div
              className="max-h-[min(26rem,45vh)] overflow-y-auto overscroll-y-contain pr-1 [scrollbar-gutter:stable]"
              aria-label="Top comments"
            >
              <ol className="space-y-4">
                {topComments.map((c, i) => (
                  <li
                    key={`${c.author}-${i}`}
                    className="border-b border-line pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-foreground">
                        {c.author}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800/90 px-2 py-0.5 text-muted">
                        <ThumbsUp className="h-3 w-3 shrink-0" aria-hidden />
                        {c.likeCount.toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                      {c.text}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
          </>
        ) : null}
      </div>
        {watchFullscreen ? (
          <button
            type="button"
            onClick={toggleWatchFullscreen}
            className="absolute bottom-4 right-4 z-20 rounded-lg border border-white/20 bg-black/80 px-3 py-2 text-xs font-medium text-white backdrop-blur hover:bg-black/90"
          >
            Exit fullscreen
          </button>
        ) : null}
        </div>

        {canEmbed ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleWatchFullscreen}
              className="rounded-lg border border-line bg-raised px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface"
            >
              Fullscreen (25% segments + video)
            </button>
            <span className="text-[11px] text-muted">
              Esc to exit. Summary stays on the page.
            </span>
          </div>
        ) : null}
      </div>

      <aside
        suppressHydrationWarning
        className="w-full shrink-0 rounded-xl border border-line bg-surface p-4 lg:sticky lg:top-16 lg:w-[380px] lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto"
        aria-labelledby="vidsum-summary-heading"
      >
        <YoutubeSummaryTakeawaysPanel
          canEmbed={canEmbed}
          analysis={analysis}
          preAnalysisHint={preAnalysisHint}
          summaryPanelScrollable={summaryPanelScrollable}
          spoilersRevealed={spoilersRevealed}
          onRevealSpoilers={() => setSpoilersRevealed(true)}
          activeHypeIdx={activeHypeIdx}
          canJump={canJump}
          canSeekEmbed={canEmbed}
          seekTo={seekTo}
          formatSecondsAsMmSs={formatSecondsAsMmSs}
          needsFictionSpoilerGate={needsFictionSpoilerGate}
        />
      </aside>
    </div>
  );
}
