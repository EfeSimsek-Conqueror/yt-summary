import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { analyzeTranscriptWithGeminiFlash } from "@/lib/ai/analyze-transcript";
import { getFalKey } from "@/lib/ai/fal-openai";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  transcript: z.string().min(1).max(200_000),
  videoTitle: z.string().max(500).optional(),
});

/**
 * POST /api/ai/analyze-transcript
 * Body: { transcript: string, videoTitle?: string }
 * Requires: logged-in user + FAL_KEY on server.
 */
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

    const analysis = await analyzeTranscriptWithGeminiFlash(parsed.data);
    return NextResponse.json(analysis);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    console.error("[analyze-transcript]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
