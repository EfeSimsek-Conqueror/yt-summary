import { DeepgramClient } from "@deepgram/sdk";
import type { ListenV1Response } from "@deepgram/sdk";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdtemp, readdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { TranscriptResponse } from "youtube-transcript";

export function getDeepgramApiKey(): string | undefined {
  const k = process.env.DEEPGRAM_API_KEY?.trim();
  return k || undefined;
}

const YTDLP_TIMEOUT_MS = 8 * 60 * 1000;
const DEEPGRAM_TIMEOUT_SEC = 600;

function getYtDlpBinary(): string {
  const fromEnv = process.env.YTDLP_PATH?.trim();
  if (fromEnv) return fromEnv;
  for (const root of [process.cwd(), join(process.cwd(), "..")]) {
    const p = join(root, "node_modules", ".bin", "yt-dlp");
    if (existsSync(p)) return p;
  }
  return "yt-dlp";
}

function youtubeCookieFileForYtDlp(dir: string): Promise<string | undefined> {
  const pathEnv = process.env.YOUTUBE_COOKIES_PATH?.trim();
  if (pathEnv && existsSync(pathEnv)) {
    return Promise.resolve(pathEnv);
  }
  const raw = process.env.YOUTUBE_COOKIES?.trim();
  if (raw) {
    const p = join(dir, "cookies.txt");
    return writeFile(p, raw, "utf8").then(() => p);
  }
  return Promise.resolve(undefined);
}

/**
 * YOUTUBE_OAUTH2=true ise yt-dlp'ye --username oauth2 --password "" gecilir.
 * Bunun icin once /api/youtube/oauth-init POST ile device flow baslatilmali,
 * kullanici google.com/device URL'sinde onaylamali.
 * Token ~/.cache/yt-dlp/ altina kaydedilir ve yeniden kullanilir.
 */
function youtubeOAuth2Args(): string[] {
  const enabled = process.env.YOUTUBE_OAUTH2?.trim();
  if (enabled === "true" || enabled === "1") {
    return ["--username", "oauth2", "--password", ""];
  }
  return [];
}

function defaultYoutubeExtractorFallbacks(): string[] {
  const one = process.env.YTDLP_YOUTUBE_EXTRACTOR_ARGS?.trim();
  if (one) return [one];
  return [
    "youtube:player_client=android",
    "youtube:player_client=mweb",
    "youtube:player_client=android_vr",
  ];
}

function spawnYtDlp(
  ytdlp: string,
  args: string[],
): Promise<{ stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(ytdlp, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr?.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("yt-dlp timeout"));
    }, YTDLP_TIMEOUT_MS);
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stderr });
      else
        reject(
          new Error(`yt-dlp exited ${code}: ${stderr.slice(-1200)}`),
        );
    });
  });
}

function deepgramResponseToRows(res: ListenV1Response): TranscriptResponse[] {
  const utterances = res.results?.utterances;
  if (Array.isArray(utterances) && utterances.length > 0) {
    const rows: TranscriptResponse[] = [];
    for (const u of utterances) {
      const text = typeof u.transcript === "string" ? u.transcript.trim() : "";
      if (!text) continue;
      const start = typeof u.start === "number" ? u.start : 0;
      const end = typeof u.end === "number" ? u.end : start;
      rows.push({
        text,
        offset: start,
        duration: Math.max(0.05, end - start),
        lang: "en",
      });
    }
    if (rows.length > 0) return rows;
  }
  const alt = res.results?.channels?.[0]?.alternatives?.[0];
  if (!alt) return [];
  const tr = alt.transcript?.trim() ?? "";
  if (tr.length > 0) {
    return [{ text: tr, offset: 0, duration: 1, lang: "en" }];
  }
  const paraTr = alt.paragraphs?.transcript?.trim();
  if (paraTr) {
    return [{ text: paraTr, offset: 0, duration: 1, lang: "en" }];
  }
  const pItems = alt.paragraphs?.paragraphs;
  if (Array.isArray(pItems)) {
    const rows: TranscriptResponse[] = [];
    for (const p of pItems) {
      const sentences = p?.sentences;
      if (!Array.isArray(sentences)) continue;
      for (const s of sentences) {
        const text = typeof s?.text === "string" ? s.text.trim() : "";
        if (!text) continue;
        const start = typeof s.start === "number" ? s.start : 0;
        const end = typeof s.end === "number" ? s.end : start;
        rows.push({
          text,
          offset: start,
          duration: Math.max(0.05, end - start),
          lang: "en",
        });
      }
    }
    if (rows.length > 0) return rows;
  }
  const words = alt.words;
  if (Array.isArray(words) && words.length > 0) {
    const stitched = words
      .map((w) => (typeof w.word === "string" ? w.word : ""))
      .filter(Boolean)
      .join(" ")
      .trim();
    if (stitched.length > 0) {
      const t0 = typeof words[0]?.start === "number" ? words[0]!.start! : 0;
      const last = words[words.length - 1];
      const t1 = typeof last?.end === "number" ? last.end : t0;
      return [
        {
          text: stitched,
          offset: t0,
          duration: Math.max(0.05, t1 - t0),
          lang: "en",
        },
      ];
    }
  }
  return [];
}

async function downloadYoutubeAudioMp3(videoId: string): Promise<Buffer> {
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const dir = await mkdtemp(join(tmpdir(), "vidsum-yt-"));
  const outTemplate = join(dir, "audio.%(ext)s");
  const ytdlp = getYtDlpBinary();
  try {
    const cookieFile = await youtubeCookieFileForYtDlp(dir);
    const oauthArgs = youtubeOAuth2Args();
    const extractors = defaultYoutubeExtractorFallbacks();
    let lastErr: Error | undefined;
    for (let i = 0; i < extractors.length; i++) {
      const extractor = extractors[i]!;
      const args: string[] = ["--extractor-args", extractor];
      // OAuth2 takes priority over cookies; don't use both
      if (oauthArgs.length > 0) {
        args.push(...oauthArgs);
      } else if (cookieFile) {
        args.push("--cookies", cookieFile);
      }
      args.push(
        "--add-header",
        "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      );
      args.push(
        "-f",
        "bestaudio",
        "--no-playlist",
        "--no-check-certificate",
        "-o",
        outTemplate,
        url,
      );
      try {
        await spawnYtDlp(ytdlp, args);
        if (i > 0) {
          console.warn(
            "[video-analysis] transcript: yt-dlp ok after fallback",
            extractor.slice(0, 72),
          );
        }
        break;
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        const msg = lastErr.message;
        const retryable =
          i < extractors.length - 1 &&
          (/bot|Sign in|not a bot|unavailable/i.test(msg) ||
            /ERROR: \[youtube\]/i.test(msg));
        if (retryable) {
          console.warn(
            "[video-analysis] transcript: yt-dlp retry with next extractor",
            videoId,
            msg.slice(0, 200),
          );
          continue;
        }
        throw lastErr;
      }
    }
    const names = await readdir(dir);
    const audio = names.find((n) => n.startsWith("audio."));
    if (!audio) {
      throw new Error(`yt-dlp produced no audio.* file in ${dir}`);
    }
    return await readFile(join(dir, audio));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function fetchTranscriptViaDeepgram(
  videoId: string,
): Promise<TranscriptResponse[]> {
  const apiKey = getDeepgramApiKey();
  if (!apiKey) return [];
  let buffer: Buffer;
  try {
    buffer = await downloadYoutubeAudioMp3(videoId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(
      "[video-analysis] transcript: deepgram yt-dlp/audio download failed",
      videoId,
      msg,
    );
    throw e;
  }
  if (buffer.length < 64) {
    console.warn(
      "[video-analysis] transcript: deepgram audio file too small",
      videoId,
      buffer.length,
    );
    return [];
  }
  const model = process.env.DEEPGRAM_MODEL?.trim() || "nova-2";
  const language = process.env.DEEPGRAM_LANGUAGE?.trim() || "en";
  const client = new DeepgramClient({ apiKey });
  let res: ListenV1Response;
  try {
    const response = await client.listen.v1.media.transcribeFile(
      buffer,
      {
        model,
        language,
        smart_format: true,
        utterances: true,
        punctuate: true,
      },
      { timeoutInSeconds: DEEPGRAM_TIMEOUT_SEC },
    );
    res = (await response) as ListenV1Response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(
      "[video-analysis] transcript: deepgram API request failed",
      videoId,
      msg,
    );
    throw e;
  }
  const rows = deepgramResponseToRows(res);
  if (rows.length === 0) {
    const ch = res.results?.channels?.length ?? 0;
    const meta = res.metadata as { duration?: number } | undefined;
    console.warn(
      "[video-analysis] transcript: deepgram returned empty parse",
      videoId,
      `channels=${ch}`,
      `duration=${meta?.duration ?? "?"}`,
    );
  }
  return rows;
}
