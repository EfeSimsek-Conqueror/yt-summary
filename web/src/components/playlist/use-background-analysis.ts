"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePlaylist } from "./playlist-context";
import { parseDurationLabelToSeconds } from "@/lib/youtube/iso-duration";
import type { AnalysisPayload, Segment, AnalysisHypeMoment } from "@/lib/types";
import { formatSecondsAsMmSs } from "@/lib/segment-time";

type ApiSegment = {
  start_sec: number;
  end_sec: number;
  title?: string;
  speakers?: string[];
  mood?: string;
  bullets: string[];
};

function mapApiSegments(raw: ApiSegment[]): Segment[] {
  return raw.map((s) => ({
    startLabel: formatSecondsAsMmSs(s.start_sec),
    endLabel: formatSecondsAsMmSs(s.end_sec),
    startSec: s.start_sec,
    heading: s.title,
    speakers: s.speakers,
    mood: s.mood as Segment["mood"],
    bullets: s.bullets,
  }));
}

function mapHype(
  raw: unknown,
): AnalysisHypeMoment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (h): h is { start_sec: number; end_sec?: number; label?: string } =>
        typeof h?.start_sec === "number",
    )
    .map((h) => ({
      startSec: h.start_sec,
      endSec: h.end_sec,
      label: h.label,
    }));
}

/**
 * Processes the playlist queue: analyses the next un-analyzed video
 * sequentially while the user watches the current one.
 */
export function useBackgroundAnalysis() {
  const { queue, currentVideoId, updateItemStatus } = usePlaylist();
  const running = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const processNext = useCallback(async () => {
    if (running.current) return;

    const next = queue.find(
      (v) =>
        v.analysisStatus === "queued" && v.id !== currentVideoId,
    );
    if (!next) return;

    running.current = true;
    const ac = new AbortController();
    abortRef.current = ac;

    updateItemStatus(next.id, "analyzing");

    try {
      const durationSec = parseDurationLabelToSeconds(next.durationLabel);
      const lang =
        typeof navigator !== "undefined"
          ? navigator.language.slice(0, 2)
          : "en";

      const res = await fetch("/api/ai/video-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: next.id,
          videoTitle: next.title,
          ...(durationSec != null ? { durationSec } : {}),
          durationLabel: next.durationLabel,
          language: lang,
        }),
        signal: ac.signal,
      });

      if (!res.ok) {
        updateItemStatus(next.id, "error");
        running.current = false;
        return;
      }

      const d = (await res.json()) as Record<string, unknown>;
      const analysis: AnalysisPayload = {
        contentKind: (d.contentKind as string as AnalysisPayload["contentKind"]) ?? "other",
        hasSpoilers: Boolean(d.hasSpoilers),
        summaryDetailed: String(d.summaryDetailed ?? ""),
        summaryShort: String(d.summaryShort ?? ""),
        revelations: Array.isArray(d.revelations)
          ? (d.revelations as string[])
          : [],
        keyPoints: Array.isArray(d.keyPoints)
          ? (d.keyPoints as string[])
          : [],
        keyMoments: Array.isArray(d.keyMoments)
          ? (d.keyMoments as string[]).slice(0, 5)
          : [],
        segments: mapApiSegments(
          Array.isArray(d.segments) ? (d.segments as ApiSegment[]) : [],
        ),
        hypeMoments: mapHype(d.hypeMoments),
      };

      updateItemStatus(next.id, "ready", analysis);

      if (typeof d.creditsRemaining === "number") {
        window.dispatchEvent(
          new CustomEvent("vidsum-credits-updated", {
            detail: { remaining: d.creditsRemaining },
          }),
        );
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        updateItemStatus(next.id, "queued");
      } else {
        updateItemStatus(next.id, "error");
      }
    } finally {
      running.current = false;
    }
  }, [queue, currentVideoId, updateItemStatus]);

  useEffect(() => {
    const hasQueued = queue.some(
      (v) => v.analysisStatus === "queued" && v.id !== currentVideoId,
    );
    if (hasQueued && !running.current) {
      void processNext();
    }
  }, [queue, currentVideoId, processNext]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);
}
