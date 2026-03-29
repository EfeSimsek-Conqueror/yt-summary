import type { TranscriptResponse } from "youtube-transcript";

/** srv3 + legacy — shared by server player fetch and browser timedtext fetch. */
export function decodeTimedtextEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
}

export function parseTimedtextSrv3OrClassic(
  xml: string,
  langLabel: string,
): TranscriptResponse[] {
  const out: TranscriptResponse[] = [];
  const srv3 = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  for (; (m = srv3.exec(xml)) !== null; ) {
    const tMs = parseInt(m[1]!, 10);
    const dMs = parseInt(m[2]!, 10);
    let inner = m[3] ?? "";
    let text = "";
    const sre = /<s[^>]*>([^<]*)<\/s>/g;
    let sm: RegExpExecArray | null;
    for (; (sm = sre.exec(inner)) !== null; ) text += sm[1] ?? "";
    if (!text) text = inner.replace(/<[^>]+>/g, "");
    text = decodeTimedtextEntities(text).trim();
    if (!text) continue;
    out.push({
      text,
      offset: tMs,
      duration: dMs,
      lang: langLabel,
    });
  }
  if (out.length > 0) return out;
  const classic = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
  for (; (m = classic.exec(xml)) !== null; ) {
    const text = decodeTimedtextEntities(m[3] ?? "").trim();
    if (!text) continue;
    out.push({
      text,
      offset: parseFloat(m[1]!),
      duration: parseFloat(m[2]!),
      lang: langLabel,
    });
  }
  return out;
}

export function captionUrlWithFmt(
  baseUrl: string,
  fmt: "srv3" | "json3",
): string {
  try {
    const u = new URL(baseUrl);
    u.searchParams.set("fmt", fmt);
    return u.toString();
  } catch {
    const join = baseUrl.includes("?") ? "&" : "?";
    return baseUrl.includes("fmt=")
      ? baseUrl.replace(/fmt=[^&]*/, `fmt=${fmt}`)
      : `${baseUrl}${join}fmt=${fmt}`;
  }
}

export function parseTimedtextJson3(
  raw: string,
  lang: string,
): TranscriptResponse[] {
  let parsed: { events?: unknown[] };
  try {
    parsed = JSON.parse(raw) as { events?: unknown[] };
  } catch {
    return [];
  }
  const events = parsed.events;
  if (!Array.isArray(events)) return [];
  const out: TranscriptResponse[] = [];
  for (const ev of events) {
    if (!ev || typeof ev !== "object") continue;
    const o = ev as Record<string, unknown>;
    const tStartMs = typeof o.tStartMs === "number" ? o.tStartMs : 0;
    const dDurationMs = typeof o.dDurationMs === "number" ? o.dDurationMs : 0;
    const segs = o.segs;
    if (!Array.isArray(segs)) continue;
    let text = "";
    for (const s of segs) {
      if (s && typeof s === "object" && "utf8" in s) {
        const u = (s as { utf8?: unknown }).utf8;
        if (typeof u === "string") text += u;
      }
    }
    text = text.replace(/\u200b/g, "").trim();
    if (!text) continue;
    const durSec = dDurationMs > 0 ? dDurationMs / 1000 : 0.05;
    out.push({
      text,
      offset: tStartMs / 1000,
      duration: durSec,
      lang,
    });
  }
  return out;
}
