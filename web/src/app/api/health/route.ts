import { NextResponse } from "next/server";

/** Railway / load balancer probes — no Supabase, no cookies. */
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
