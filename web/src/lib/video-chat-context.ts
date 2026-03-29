import type { AnalysisPayload } from "@/lib/types";
import { segmentStartSeconds, timestampLabelToSeconds } from "@/lib/segment-time";

/** Compact payload sent to /api/ai/video-chat (timestamps in seconds for seek control). */
export function buildVideoChatContext(analysis: AnalysisPayload) {
  return {
    contentKind: analysis.contentKind,
    summaryShort: analysis.summaryShort.slice(0, 1_200),
    summaryDetailed: analysis.summaryDetailed.slice(0, 6_000),
    keyPoints: analysis.keyPoints.slice(0, 10),
    keyMoments: analysis.keyMoments.slice(0, 5),
    segments: analysis.segments.map((s, i) => ({
      index: i + 1,
      startSec: segmentStartSeconds(s),
      endSec: timestampLabelToSeconds(s.endLabel),
      title: s.heading ?? null,
      mood: s.mood ?? null,
      bullets: s.bullets.slice(0, 6),
    })),
    hypeMoments: analysis.hypeMoments.map((h, i) => ({
      index: i + 1,
      startSec: h.startSec,
      endSec: h.endSec ?? null,
      label: h.label ?? null,
    })),
  };
}
