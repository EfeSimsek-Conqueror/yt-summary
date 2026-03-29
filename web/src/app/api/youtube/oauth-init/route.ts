import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

function getYtDlpBinary(): string {
  const fromEnv = process.env.YTDLP_PATH?.trim();
  if (fromEnv) return fromEnv;
  for (const root of [process.cwd(), join(process.cwd(), "..")]) {
    const p = join(root, "node_modules", ".bin", "yt-dlp");
    if (existsSync(p)) return p;
  }
  return "yt-dlp";
}

// In-memory store for the ongoing oauth process output
let oauthState: {
  verificationUrl?: string;
  userCode?: string;
  done: boolean;
  error?: string;
  output: string;
} = { done: false, output: "" };

let oauthProcess: ReturnType<typeof spawn> | null = null;

function parseOAuthOutput(text: string): void {
  // yt-dlp prints: Please open https://www.google.com/device and enter code XXXX-XXXX
  const urlMatch = text.match(/Please open (https?:\/\/[^\s]+)/);
  if (urlMatch) oauthState.verificationUrl = urlMatch[1];
  const codeMatch = text.match(/enter(?:\s+the)?(?:\s+code)?:?\s+([A-Z0-9]{4}-[A-Z0-9]{4})/i);
  if (codeMatch) oauthState.userCode = codeMatch[1];
}

export async function GET() {
  // Return current state
  return NextResponse.json(oauthState);
}

export async function POST() {
  // Reset state
  if (oauthProcess) {
    try { oauthProcess.kill(); } catch {}
    oauthProcess = null;
  }
  oauthState = { done: false, output: "" };

  const ytdlp = getYtDlpBinary();

  // Run yt-dlp with oauth2 - it will print a verification URL and wait
  // We use a dummy URL just to trigger the auth flow
  const args = [
    "--username", "oauth2",
    "--password", "",
    "-x",
    "--skip-download",
    "--print", "%(id)s",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  ];

  try {
    oauthProcess = spawn(ytdlp, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const handleOutput = (data: Buffer) => {
      const text = data.toString();
      oauthState.output += text;
      parseOAuthOutput(text);
      console.log("[oauth-init] yt-dlp:", text.trim());
    };

    oauthProcess.stdout?.on("data", handleOutput);
    oauthProcess.stderr?.on("data", handleOutput);

    oauthProcess.on("close", (code) => {
      oauthState.done = true;
      if (code !== 0 && !oauthState.verificationUrl) {
        oauthState.error = `yt-dlp exited ${code}`;
      }
      console.log("[oauth-init] yt-dlp process ended, code:", code);
      oauthProcess = null;
    });

    oauthProcess.on("error", (err) => {
      oauthState.done = true;
      oauthState.error = err.message;
      oauthProcess = null;
    });

    // Wait up to 15s for the verification URL to appear
    const deadline = Date.now() + 15000;
    while (!oauthState.verificationUrl && !oauthState.done && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
    }

    return NextResponse.json(oauthState);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ done: true, error: msg, output: "" }, { status: 500 });
  }
}
