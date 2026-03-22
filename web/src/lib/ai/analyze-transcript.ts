import { z } from "zod";
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
  "other",
]);

const analysisSchema = z.object({
  content_kind: contentKindSchema,
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
  ]
}

Rules:
- content_kind: Pick the best fit. Use tv_episode for series episodes; film_recap for movies; fiction_other for stories/animation not clearly TV or film; tutorial/news/podcast/vlog/review/other as appropriate.
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

const MAX_TRANSCRIPT_CHARS = 100_000;

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
}): Promise<TranscriptAnalysis> {
  const body =
    input.videoTitle !== undefined
      ? `Video title: ${input.videoTitle}\n\nTranscript:\n${input.transcript.slice(0, MAX_TRANSCRIPT_CHARS)}`
      : `Transcript:\n${input.transcript.slice(0, MAX_TRANSCRIPT_CHARS)}`;

  const client = getFalOpenAI();

  const response = await client.responses.create({
    model: GEMINI_FLASH,
    instructions: INSTRUCTIONS,
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
