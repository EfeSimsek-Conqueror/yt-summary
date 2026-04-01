import { readSupadataApiKey } from "@/lib/server/supadata-env";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * No secret values — only whether Supadata is visible to this Node process.
 * `supadataKeyLength` > 0 means a non-empty key string (length only, safe).
 * `envKeyNamesWithSupadata` lists matching env *names* (typos like `SUPADATA_API_KEY `).
 */
export async function GET() {
  const key = readSupadataApiKey();
  const env = globalThis.process?.env ?? {};
  const envKeyNamesWithSupadata = Object.keys(env).filter((k) =>
    k.toUpperCase().includes("SUPADATA"),
  );

  return NextResponse.json({
    supadataConfigured: Boolean(key),
    supadataKeyLength: key?.length ?? 0,
    envKeyNamesWithSupadata,
  });
}
