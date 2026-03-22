/**
 * Segment atmosphere for UI coloring. Model returns a loose string; we normalize here.
 */
export const SEGMENT_MOODS = [
  "romantic",
  "comedy",
  "action",
  "tense",
  "dramatic",
  "educational",
  "calm",
  "sad",
  "inspiring",
  "neutral",
] as const;

export type SegmentMood = (typeof SEGMENT_MOODS)[number];

const ALIASES: Record<string, SegmentMood> = {
  romantic: "romantic",
  romance: "romantic",
  love: "romantic",

  comedy: "comedy",
  humorous: "comedy",
  funny: "comedy",
  humor: "comedy",

  action: "action",
  exciting: "action",

  tense: "tense",
  suspense: "tense",
  suspenseful: "tense",
  thriller: "tense",
  scary: "tense",

  dramatic: "dramatic",
  drama: "dramatic",
  conflict: "dramatic",

  educational: "educational",
  informative: "educational",
  tutorial: "educational",
  explanation: "educational",
  technical: "educational",

  calm: "calm",
  peaceful: "calm",
  relaxed: "calm",
  chill: "calm",

  sad: "sad",
  melancholic: "sad",
  emotional: "sad",
  somber: "sad",

  inspiring: "inspiring",
  uplifting: "inspiring",
  motivational: "inspiring",
  hopeful: "inspiring",

  neutral: "neutral",
  default: "neutral",
  general: "neutral",
  mixed: "neutral",
};

export function normalizeSegmentMood(raw?: string | null): SegmentMood {
  if (!raw || typeof raw !== "string") return "neutral";
  const k = raw
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
  if (ALIASES[k]) return ALIASES[k];
  const first = k.split("_")[0];
  if (first && ALIASES[first]) return ALIASES[first];
  const simple = k.replace(/_/g, "");
  if (ALIASES[simple]) return ALIASES[simple];
  if (SEGMENT_MOODS.includes(k as SegmentMood)) return k as SegmentMood;
  return "neutral";
}

export const MOOD_LABELS: Record<SegmentMood, string> = {
  romantic: "Romantic",
  comedy: "Comedy",
  action: "Action",
  tense: "Tense",
  dramatic: "Drama",
  educational: "Educational",
  calm: "Calm",
  sad: "Melancholy",
  inspiring: "Inspiring",
  neutral: "Neutral",
};

/** Tailwind classes (full strings for JIT). Timestamps always use `text-accent` in UI for consistency. */
export function moodVisuals(mood: SegmentMood) {
  switch (mood) {
    case "romantic":
      return {
        borderLeft: "border-l-rose-500",
        chip: "bg-rose-500/15 text-rose-100 border border-rose-500/35",
        speakerLine: "text-rose-100/90",
        speakerNames: "text-rose-50",
        activeRing: "ring-rose-400/45",
        activeBg: "bg-rose-500/10",
      };
    case "comedy":
      return {
        borderLeft: "border-l-amber-400",
        chip: "bg-amber-400/15 text-amber-100 border border-amber-400/35",
        speakerLine: "text-amber-100/90",
        speakerNames: "text-amber-50",
        activeRing: "ring-amber-300/45",
        activeBg: "bg-amber-400/10",
      };
    case "action":
      return {
        borderLeft: "border-l-orange-600",
        chip: "bg-orange-600/20 text-orange-100 border border-orange-500/40",
        speakerLine: "text-orange-100/90",
        speakerNames: "text-orange-50",
        activeRing: "ring-orange-400/50",
        activeBg: "bg-orange-600/12",
      };
    case "tense":
      return {
        borderLeft: "border-l-violet-500",
        chip: "bg-violet-500/15 text-violet-100 border border-violet-500/35",
        speakerLine: "text-violet-100/90",
        speakerNames: "text-violet-50",
        activeRing: "ring-violet-400/45",
        activeBg: "bg-violet-500/10",
      };
    case "dramatic":
      return {
        borderLeft: "border-l-indigo-500",
        chip: "bg-indigo-500/15 text-indigo-100 border border-indigo-500/35",
        speakerLine: "text-indigo-100/90",
        speakerNames: "text-indigo-50",
        activeRing: "ring-indigo-400/45",
        activeBg: "bg-indigo-500/10",
      };
    case "educational":
      return {
        borderLeft: "border-l-cyan-500",
        chip: "bg-cyan-500/15 text-cyan-100 border border-cyan-500/35",
        speakerLine: "text-cyan-100/90",
        speakerNames: "text-cyan-50",
        activeRing: "ring-cyan-400/45",
        activeBg: "bg-cyan-500/10",
      };
    case "calm":
      return {
        borderLeft: "border-l-emerald-500",
        chip: "bg-emerald-500/15 text-emerald-100 border border-emerald-500/35",
        speakerLine: "text-emerald-100/90",
        speakerNames: "text-emerald-50",
        activeRing: "ring-emerald-400/45",
        activeBg: "bg-emerald-500/10",
      };
    case "sad":
      return {
        borderLeft: "border-l-slate-500",
        chip: "bg-slate-500/20 text-slate-200 border border-slate-500/35",
        speakerLine: "text-slate-200/90",
        speakerNames: "text-slate-100",
        activeRing: "ring-slate-400/40",
        activeBg: "bg-slate-500/10",
      };
    case "inspiring":
      return {
        borderLeft: "border-l-sky-500",
        chip: "bg-sky-500/15 text-sky-100 border border-sky-500/35",
        speakerLine: "text-sky-100/90",
        speakerNames: "text-sky-50",
        activeRing: "ring-sky-400/45",
        activeBg: "bg-sky-500/10",
      };
    default:
      return {
        borderLeft: "border-l-zinc-500",
        chip: "bg-zinc-500/15 text-zinc-200 border border-zinc-500/30",
        speakerLine: "text-muted",
        speakerNames: "text-foreground",
        activeRing: "ring-accent/45",
        activeBg: "bg-accent/10",
      };
  }
}
