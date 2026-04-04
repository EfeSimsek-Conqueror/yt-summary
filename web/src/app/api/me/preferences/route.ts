import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const DEFAULTS = {
  analysis_language: "en",
  auto_analyze: true,
  spoiler_protection: true,
  default_summary_view: "detailed",
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("user_preferences")
    .select("analysis_language, auto_analyze, spoiler_protection, default_summary_view")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json(data ?? DEFAULTS);
}

const patchSchema = z.object({
  analysis_language: z.string().min(2).max(10).optional(),
  auto_analyze: z.boolean().optional(),
  spoiler_protection: z.boolean().optional(),
  default_summary_view: z.enum(["short", "detailed"]).optional(),
});

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json: unknown = await request.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      { user_id: user.id, ...DEFAULTS, ...updates },
      { onConflict: "user_id" },
    );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  const { data: row } = await supabase
    .from("user_preferences")
    .select("analysis_language, auto_analyze, spoiler_protection, default_summary_view")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json(row);
}
