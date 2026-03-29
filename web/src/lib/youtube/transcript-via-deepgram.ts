import { DeepgramClient } from "@deepgram/sdk";
import type { ListenV1Response } from "@deepgram/sdk";
import { spawn } from "child_process";
import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { TranscriptResponse } from "youtube-transcript";

export function getDeepgramApiKey(): string | undefined {
  const k = process.env.DEEPGRAM_API_KEY?.trim();
  return k || undefined;
}

const YTDLP_TIMEOUT_MS = 8 * 60 * 1000;
const DEEPGRAM_TIMEOUT_SEC = 600;

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

  const tr =
    res.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
  if (tr.length === 0) return [];
  return [{ text: tr, offset: 0, duration: 1, lang: "en" }];
}

async function downloadYoutubeAudioMp3(videoId: string): Promise<Buffer> {
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const dir = await mkdtemp(join(tmpdir(), "vidsum-yt-"));
  const out = join(dir, "audio.mp3");
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        "yt-dlp",
        [
          "-f",
          "bestaudio/best",
          "-x",
          "--audio-format",
          "mp3",
          "--no-playlist",
          "-o",
          out,
          url,
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
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
        if (code === 0) resolve();
        else
          reject(
            new Error(
              `yt-dlp exited ${code}: ${stderr.slice(-600)}`,
            ),
          );
      });
    });
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Download audio with yt-dlp, transcribe with Deepgram. Requires `DEEPGRAM_API_KEY`
 * and `yt-dlp` + `ffmpeg` on the server (see `nixpacks.toml`).
 */
export async function fetchTranscriptViaDeepgram(
  videoId: string,
): Promise<TranscriptResponse[]> {
  const apiKey = getDeepgramApiKey();
  if (!apiKey) return [];

  const buffer = await downloadYoutubeAudioMp3(videoId);
  if (buffer.length < 64) return [];

  const model =
    process.env.DEEPGRAM_MODEL?.trim() || "nova-2";
  const language =
    process.env.DEEPGRAM_LANGUAGE?.trim() || "en";

  const client = new DeepgramClient({ apiKey });

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

  const res = (await response) as ListenV1Response;
  return deepgramResponseToRows(res);
}
