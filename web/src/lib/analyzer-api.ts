/**
 * Optional Python “YouTube Analyzer” API (separate Railway service).
 * Not the same as the Next.js public URL (`NEXT_PUBLIC_APP_URL`).
 */
export function getAnalyzerApiBaseUrl(): string | undefined {
  const raw =
    process.env.ANALYZER_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_ANALYZER_API_URL?.trim();
  if (!raw) return undefined;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}

export type AnalyzerRootHealth =
  | { configured: false }
  | {
      configured: true;
      reachable: boolean;
      host: string;
      message?: string;
      version?: string;
      status?: string;
      error?: string;
    };

export async function fetchAnalyzerRootHealth(): Promise<AnalyzerRootHealth> {
  const base = getAnalyzerApiBaseUrl();
  if (!base) return { configured: false };

  const host = new URL(base).host;
  try {
    const res = await fetch(`${base}/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      return {
        configured: true,
        reachable: false,
        host,
        error: `HTTP ${res.status}`,
      };
    }
    const data: unknown = await res.json().catch(() => null);
    const obj =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : null;
    return {
      configured: true,
      reachable: true,
      host,
      message: typeof obj?.message === "string" ? obj.message : undefined,
      version: typeof obj?.version === "string" ? obj.version : undefined,
      status: typeof obj?.status === "string" ? obj.status : undefined,
    };
  } catch (e) {
    return {
      configured: true,
      reachable: false,
      host,
      error: e instanceof Error ? e.message : "unreachable",
    };
  }
}
