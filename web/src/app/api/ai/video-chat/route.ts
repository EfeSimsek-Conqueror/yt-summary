import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getFalKey, getFalOpenAI } from "@/lib/ai/fal-openai";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

const GEMINI_FLASH = "google/gemini-2.5-flash";

const historyItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(12_000),
});

const bodySchema = z.object({
  videoId: z.string().min(1).max(32),
  videoTitle: z.string().max(500).optional(),
  message: z.string().min(1).max(2000),
  history: z.array(historyItemSchema).max(16).optional(),
  context: z.record(z.string(), z.unknown()),
});

const replySchema = z.object({
  reply: z.string().min(1).max(8000),
  seekToSec: z.union([z.number(), z.null()]).optional(),
});

function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseJsonObject(text: string): unknown {
  const t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]?.trim().startsWith("{")) {
    return JSON.parse(fence[1].trim());
  }
  const balanced = extractBalancedJsonObject(t);
  if (balanced) return JSON.parse(balanced);
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));
  return JSON.parse(t);
}

const SYSTEM = `You are VidSum's assistant for ONE YouTube video. The user may write in Turkish or English.

You receive VIDEO CONTEXT as JSON:
- contentKind: e.g. music, tutorial, news, podcast, other — use it to interpret intent (music → hype/drops; sports or match recap → goals/highlights in keyMoments or segments).
- segments[]: narrative sections with startSec/endSec (seconds), title, bullets.
- hypeMoments[]: energy peaks (music, trailers); prefer these when the user asks for hype, drop, chorus, beat, peak, "en iyi kısım".
- keyMoments[]: short highlight lines (goals, key beats); match phrases like "goal", "gol", "scorer", "minute 34" to the closest segment/hype by meaning and time.
- keyPoints: bullet facts for Q&A (not always timestamps).

Answer ONLY from that context; do not invent timestamps or facts.

When the user asks to jump, seek, go to, play from, open, show, skip to, or "take me to" something (e.g. "first hype", "second segment", "gol dakikası", "goal moment", "chorus", "tutorial step", "şarkının en yoğun yeri"), set "seekToSec" to the best matching start time in seconds:
- Music / energy → hypeMoments first, else segments.
- Story/tutorial → segments by title/bullets.
- Sports/highlights → keyMoments + segments; map "gol" / "goal" to the described moment.

If the user only asks a question without seeking, or you cannot map a time, set "seekToSec" to null.

Output ONLY valid JSON (no markdown fences):
{"reply":"<your answer>","seekToSec":null}
or {"reply":"<your answer>","seekToSec":123.4}

Keep "reply" concise (under ~350 words).`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!getFalKey()) {
      return NextResponse.json(
        { error: "FAL_KEY is not configured on the server" },
        { status: 503 },
      );
    }

    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { videoId, videoTitle, message, history, context } = parsed.data;

    let convo = "";
    if (history && history.length > 0) {
      convo = "CONVERSATION SO FAR:\n";
      for (const h of history) {
        convo +=
          h.role === "user"
            ? `User: ${h.content}\n\n`
            : `Assistant: ${h.content}\n\n`;
      }
    }

    const userBlock = `videoId: ${videoId}
videoTitle: ${videoTitle ?? "(unknown)"}

VIDEO CONTEXT (JSON):
${JSON.stringify(context)}

${convo}CURRENT USER MESSAGE:
${message}`;

    const client = getFalOpenAI();
    const response = await client.responses.create({
      model: GEMINI_FLASH,
      instructions: SYSTEM,
      input: userBlock,
      temperature: 0.35,
      max_output_tokens: 4_096,
    });

    const raw = response.output_text?.trim() ?? "";
    if (!raw) {
      return NextResponse.json(
        { error: "Empty model response" },
        { status: 502 },
      );
    }

    let parsedReply: unknown;
    try {
      parsedReply = parseJsonObject(raw);
    } catch {
      return NextResponse.json(
        {
          reply: raw,
          seekToSec: null as number | null,
          parseWarning: "Model did not return JSON; showing raw text.",
        },
        { status: 200 },
      );
    }

    const checked = replySchema.safeParse(parsedReply);
    if (!checked.success) {
      return NextResponse.json({
        reply:
          typeof parsedReply === "object" &&
          parsedReply &&
          "reply" in parsedReply &&
          typeof (parsedReply as { reply: unknown }).reply === "string"
            ? (parsedReply as { reply: string }).reply
            : raw,
        seekToSec: null as number | null,
        parseWarning: "Partial parse",
      });
    }

    let seek = checked.data.seekToSec;
    if (seek !== undefined && seek !== null) {
      if (!Number.isFinite(seek)) seek = null;
      else seek = Math.max(0, Math.min(86400, seek));
    } else {
      seek = null;
    }

    return NextResponse.json({
      reply: checked.data.reply,
      seekToSec: seek,
    });
  } catch (e) {
    const messageText = e instanceof Error ? e.message : "Chat failed";
    console.error("[video-chat]", e);
    return NextResponse.json({ error: messageText }, { status: 502 });
  }
}
