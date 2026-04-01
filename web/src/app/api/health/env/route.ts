import { readSupadataApiKey } from "@/lib/server/supadata-env";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * No secrets returned — only whether server env sees Supadata. Use after setting
 * Railway variables to confirm the running deployment picked them up (redeploy if false).
 */
export async function GET() {
  return NextResponse.json({
    supadataConfigured: Boolean(readSupadataApiKey()),
  });
}
