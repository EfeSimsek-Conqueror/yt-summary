export type Channel = {
  id: string;
  title: string;
  thumbnailUrl?: string;
};

import type { SegmentMood } from "@/lib/segment-mood";

export type Segment = {
  startLabel: string;
  endLabel: string;
  bullets: string[];
  /** Start time in seconds (optional; otherwise parsed from startLabel) */
  startSec?: number;
  /** Short topic next to the timestamp (may include one leading emoji) */
  heading?: string;
  /** People speaking in this segment when identifiable from the transcript */
  speakers?: string[];
  /** Dominant atmosphere; drives segment card colors */
  mood?: SegmentMood;
};

export type Video = {
  id: string;
  channelId: string;
  title: string;
  durationLabel: string;
  summaryShort: string;
  transcriptPreview: string;
  segments: Segment[];
  /** Set when loaded from YouTube API */
  thumbnailUrl?: string;
  /** Channel display name from YouTube snippet (when not in mock catalog) */
  channelTitle?: string;
};
