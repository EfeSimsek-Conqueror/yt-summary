import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("video_analyses")
    .select("id, video_id, language, analysis, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((r) => {
    const a = r.analysis as Record<string, unknown> | null;
    return {
      id: r.id,
      videoId: r.video_id,
      language: r.language,
      title:
        (a?.summary_short as string) ??
        (a?.summaryShort as string) ??
        r.video_id,
      createdAt: r.created_at,
    };
  });

  return NextResponse.json({ history: rows });
}
