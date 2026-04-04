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

  const { data: playlists, error } = await supabase
    .from("user_playlists")
    .select("id, name, created_at, updated_at, playlist_items(count)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (playlists ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    videoCount:
      Array.isArray(p.playlist_items) && p.playlist_items[0]
        ? (p.playlist_items[0] as { count: number }).count
        : 0,
  }));

  return NextResponse.json({ playlists: rows });
}
