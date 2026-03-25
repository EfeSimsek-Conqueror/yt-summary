import { z } from "zod";
import { formatDurationLabel } from "@/lib/youtube/iso-duration";
import { getFalOpenAI } from "./fal-openai";

const GEMINI_FLASH = "google/gemini-2.5-flash";

const segmentSchema = z.object({
  start_sec: z.number().nonnegative(),
  end_sec: z.number().nonnegative(),
  title: z.string().optional(),
  speakers: z.array(z.string()).max(8).optional(),
  /** Atmosphere: romantic, comedy, action, tense, dramatic, educational, calm, sad, inspiring, neutral */
  mood: z.string().max(40).optional(),
  bullets: z.array(z.string()),
});

const contentKindSchema = z.enum([
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

type ContentKind = z.infer<typeof contentKindSchema>;

/** Maps model drift (wrong casing, synonyms) to a valid content_kind. */
function normalizeContentKind(value: unknown): ContentKind {
  if (typeof value !== "string") {
    return "other";
  }
  const raw = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const direct = contentKindSchema.safeParse(raw);
  if (direct.success) {
    return direct.data;
  }
  const aliases: Record<string, ContentKind> = {
    tv: "tv_episode",
    television: "tv_episode",
    series: "tv_episode",
    episode: "tv_episode",
    movie: "film_recap",
    film: "film_recap",
    cinema: "film_recap",
    documentary: "news",
    doc: "news",
    report: "news",
    interview: "podcast",
    debate: "podcast",
    lecture: "tutorial",
    educational: "tutorial",
    howto: "tutorial",
    how_to: "tutorial",
    gaming: "vlog",
    gameplay: "vlog",
    stream: "vlog",
    mv: "music",
    music_video: "music",
    song: "music",
    lyric: "music",
    lyrics: "music",
    performance: "music",
    live_music: "music",
    concert: "music",
    music: "music",
    sports: "other",
    comedy: "other",
    entertainment: "other",
    animation: "fiction_other",
    anime: "fiction_other",
    story: "fiction_other",
  };
  return aliases[raw] ?? "other";
}

const analysisSchema = z.object({
  content_kind: z.preprocess(
    (v) => normalizeContentKind(v),
    contentKindSchema,
  ),
  /** True if plot twists, endings, episode surprises, or major story reveals are discussed */
  has_spoilers: z.boolean(),
  summary_short: z.string().min(1).max(400),
  /**
   * ~200–280 words (aim ~250). Same language as transcript when possible.
   * Fiction: past-tense story style (“what happened”). NOT a transcript paste.
   */
  summary_detailed: z.string().min(80).max(2_400),
  /** Major twists / secrets / endings—short one-line items; empty array if none */
  revelations: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.string()).max(12),
  ),
  /** Informative videos: concrete facts, steps, numbers—listed; empty if not applicable */
  key_points: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.string()).max(15),
  ),
  segments: z.array(segmentSchema).max(10),
  /**
   * Music videos / performances: timestamps where energy peaks (drops, chorus hits,
   * build-ups that explode, big instrumental hits). Empty for non-music.
   */
  hype_moments: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z
      .array(
        z
          .object({
            start_sec: z.coerce.number().nonnegative(),
            end_sec: z.coerce.number().nonnegative().optional(),
            label: z.string().max(120).optional(),
          })
          .transform((h) => {
            const end =
              h.end_sec !== undefined && h.end_sec >= h.start_sec
                ? h.end_sec
                : undefined;
            return { start_sec: h.start_sec, end_sec: end, label: h.label };
          }),
      )
      .max(12),
  ),
});

export type TranscriptAnalysis = z.infer<typeof analysisSchema>;

const INSTRUCTIONS = `You analyze YouTube (or similar) video transcripts.

Return ONLY raw JSON (no markdown code fences, no commentary) with this exact shape:
{
  "content_kind": "tv_episode",
  "has_spoilers": true,
  "summary_short": "One line under ~200 characters for a card preview (no major spoilers if has_spoilers is true).",
  "summary_detailed": "Plain text, use \\n between paragraphs. Target about 200–280 words (roughly 250)—not much shorter unless the video is extremely short; do not exceed ~280 words.",
  "revelations": ["One-line twist or secret from the video", "Another if any"],
  "key_points": ["For tutorials/news: fact or step as a direct bullet", "Or empty array if this is pure fiction recap"],
  "segments": [
    {
      "start_sec": 0,
      "end_sec": 120,
      "title": "Optional short topic; you may start with one emoji (e.g. 💬 Interview)",
      "speakers": ["Name One", "Name Two"],
      "mood": "educational",
      "bullets": ["Key idea", "Another point"]
    }
  ],
  "hype_moments": [
    { "start_sec": 45.2, "end_sec": 52.0, "label": "Beat drop / chorus hit" }
  ]
}

Rules:
- content_kind: Pick the best fit. Use music for MVs, official audio, lyric videos, live song performances, concerts. Use tv_episode for series episodes; film_recap for movies; fiction_other for stories/animation not clearly TV or film; tutorial/news/podcast/vlog/review/other as appropriate.
- hype_moments: REQUIRED array (use [] if not a music-focused video). For content_kind music (or clear song/MV content): list 3–12 moments where the track or video energy spikes—beat drops, chorus or hook entries, big instrumental hits, build-ups that “explode”, climax sections, or obvious visual sync peaks. Each item needs start_sec (seconds from video start). Optionally end_sec if the moment is a short window. label: very short (e.g. “Drop”, “Chorus”, “Bridge build”, “Final chorus”). Estimate times from lyrics/transcript pacing and structure if exact timestamps are unclear; order chronologically. For non-music videos, use [].
- has_spoilers: true if the video reveals plot, endings, twists, killer identity, who dies, finale details, or comparable spoilers. false for generic non-fiction with no such reveals.
- summary_detailed: REQUIRED. Length ~200–280 words (about 250). Same language as the transcript when possible. NOT a transcript dump—no long quotes. For tv_episode / film_recap / fiction_other: write as a clear recap (“This happens, then…”, who does what). For tutorial/news/podcast: structured explanation with main ideas; you may still use short paragraphs. Do not pad with filler.
- revelations: Each item ONE short sentence for a twist, secret, ending reveal, or “what you need to know” spoiler. Use [] if none. Do not repeat summary_detailed verbatim—extract the punchiest reveals.
- key_points: For informative content, list direct, scannable facts or steps (no fluff). Use [] for pure fiction recaps. When both apply, fill both (e.g. review of a film: key_points for critique bullets, revelations for plot spoilers).
- summary_short: One line; if has_spoilers, avoid spoiling the ending in this line.
- At most 10 segments.
- start_sec and end_sec are seconds from the start of the video; use the transcript's timeline. If timestamps are missing, estimate sensible ranges that cover the full narrative in order.
- end_sec must be >= start_sec.
- title: short segment topic for UI (not repeated inside bullets). Optional one leading emoji is OK.
- speakers: REQUIRED when anyone speaks—use real names from the transcript, or roles such as Host, Narrator, Guest A, Interviewer. If multiple people, list all who have lines in that segment. Use ["Narrator"] only for voiceover with no named person.
- mood: REQUIRED for each segment. One lowercase English word (or short phrase mapped to it) for the dominant vibe: romantic, comedy, action, tense, dramatic, educational, calm, sad, inspiring, or neutral. Examples: flirty scene→romantic; jokes→comedy; fight/chase→action; suspense→tense; argument/revelation→dramatic; teaching→educational; quiet reflection→calm; grief→sad; pep talk→inspiring; plain info→neutral.
- Bullets: 1–4 per segment, concise facts only—do not repeat the title or list speaker names again unless needed for content.
- Cover the whole transcript without leaving huge uncovered gaps when possible.`;

/** Appended when video duration (seconds) is known so segments span the full video. */
const DURATION_SEGMENT_RULES = `

Critical — when "Video duration" appears in the user message:
- The video’s total runtime is FIXED (given in seconds). Your segment list MUST cover the entire video from second 0 through the end.
- The LAST segment’s end_sec must be within about 5–15 seconds of that total duration (the final timestamp), unless the transcript explicitly ends much earlier with no further content.
- Do NOT stop segment timestamps around an early minute mark (e.g. ~1:50) when the video is several minutes longer—stretch segments across the full 0…duration range so there is no huge uncovered tail.
- If you have at most 10 segments, divide the timeline proportionally so the narrative spans the full length; the final segment should include what happens in the last part of the video.`;

const VISUAL_MERGE_RULES = `

When a "Visual analysis" section is included below:
- The speech transcript may be incomplete, wrong for action-heavy scenes, or missing. Use the visual analysis to describe fights, choreography, who is on screen, setting, gameplay UI, and non-dialogue story beats.
- For films, TV clips, gameplays, and trailers: prefer aligning segments and summaries with BOTH sources; if they conflict on what happened on screen, trust the visual analysis for physical action and identity when visible.
- Still produce valid JSON; speakers may be inferred from visuals when dialogue is unclear.`;

const MAX_TRANSCRIPT_CHARS = 100_000;
const MAX_VISUAL_CONTEXT_CHARS = 60_000;

function extractJsonObject(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) return fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}

/**
 * Calls Gemini 2.5 Flash via fal/OpenRouter Responses API to produce summary + segments.
 */
export async function analyzeTranscriptWithGeminiFlash(input: {
  transcript: string;
  videoTitle?: string;
  /** YouTube/runtime length in seconds (from client metadata). Ensures segments span full video. */
  videoDurationSec?: number;
  /** On-screen description when speech transcript is thin (no-caption fallback). */
  visualContext?: string;
}): Promise<TranscriptAnalysis> {
  const visual =
    input.visualContext?.trim() &&
    `\n\n---\nVisual analysis (on-screen; use per instructions when present):\n${input.visualContext.slice(0, MAX_VISUAL_CONTEXT_CHARS)}`;

  const durationBlock =
    input.videoDurationSec !== undefined &&
    input.videoDurationSec > 0 &&
    Number.isFinite(input.videoDurationSec)
      ? `\nVideo duration: ${Math.round(input.videoDurationSec)} seconds (about ${formatDurationLabel(Math.round(input.videoDurationSec))} total). Use this as the end of the timeline for segments.\n`
      : "";

  const body =
    input.videoTitle !== undefined
      ? `Video title: ${input.videoTitle}\n${durationBlock}\nTranscript:\n${input.transcript.slice(0, MAX_TRANSCRIPT_CHARS)}${visual ?? ""}`
      : `${durationBlock ? `${durationBlock}\n` : ""}Transcript:\n${input.transcript.slice(0, MAX_TRANSCRIPT_CHARS)}${visual ?? ""}`;

  const hasDuration =
    input.videoDurationSec !== undefined &&
    input.videoDurationSec > 0 &&
    Number.isFinite(input.videoDurationSec);

  const client = getFalOpenAI();

  const response = await client.responses.create({
    model: GEMINI_FLASH,
    instructions: `${INSTRUCTIONS}${hasDuration ? DURATION_SEGMENT_RULES : ""}${visual ? VISUAL_MERGE_RULES : ""}`,
    input: body,
    temperature: 0.35,
    max_output_tokens: 8192,
  });

  const raw = response.output_text?.trim() ?? "";
  if (!raw) {
    throw new Error("Empty model response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    throw new Error("Model did not return valid JSON");
  }

  const result = analysisSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid analysis shape: ${result.error.message}`);
  }

  return result.data;
}
