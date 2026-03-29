import { NextRequest, NextResponse } from "next/server";
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

let oauthState: {
  verificationUrl?: string;
  userCode?: string;
  done: boolean;
  error?: string;
  output: string;
} = { done: false, output: "" };

let oauthProcess: ReturnType<typeof spawn> | null = null;

function parseOAuthOutput(text: string): void {
  const urlMatch = text.match(/Please open (https?:\/\/[^\s]+)/);
  if (urlMatch) oauthState.verificationUrl = urlMatch[1];
  const codeMatch = text.match(/code[:\s]+([A-Z0-9]{4}-[A-Z0-9]{4})/i);
  if (codeMatch) oauthState.userCode = codeMatch[1];
}

const HTML_PAGE = `<!DOCTYPE html>
<html>
<head><title>YouTube OAuth2 Init</title>
<style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px;background:#111;color:#eee}
button{background:#f00;color:#fff;border:none;padding:12px 24px;font-size:16px;cursor:pointer;border-radius:6px}
a{color:#4af}pre{background:#222;padding:16px;border-radius:6px;overflow-x:auto;white-space:pre-wrap}
</style>
</head>
<body>
<h1>YouTube OAuth2 Setup</h1>
<p>Bu sayfa Railway'deki yt-dlp'ye Google hesabi erisimi verir. Bir kez yeterli.</p>
<form method="POST">
  <button type="submit">OAuth2 Flow Baslat</button>
</form>
<div id="result"></div>
<script>
document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  document.getElementById('result').innerHTML = '<p>Baslatiyor...</p>';
  const res = await fetch('/api/youtube/oauth-init', {method:'POST'});
  const data = await res.json();
  let html = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
  if (data.verificationUrl) {
    html = '<h2>Adim 1: Asagidaki linke tiklayip Google hesabini sec</h2>' +
      '<p><a href="' + data.verificationUrl + '" target="_blank">' + data.verificationUrl + '</a></p>' +
      (data.userCode ? '<h2>Adim 2: Bu kodu gir: <code>' + data.userCode + '</code></h2>' : '') +
      '<p>Onayladiktan sonra yt-dlp tokeni kaydeder. Sayfayi yenilemene gerek yok.</p>';
  } else if (data.error) {
    html = '<p style="color:red">Hata: ' + data.error + '</p><pre>' + data.output + '</pre>';
  }
  document.getElementById('result').innerHTML = html;
});
</script>
</body></html>`;

export async function GET() {
  return new NextResponse(HTML_PAGE, {
    headers: { "Content-Type": "text/html" },
  });
}

export async function POST(_req: NextRequest) {
  if (oauthProcess) {
    try { oauthProcess.kill(); } catch {}
    oauthProcess = null;
  }
  oauthState = { done: false, output: "" };

  const ytdlp = getYtDlpBinary();
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
      console.log("[oauth-init] done, code:", code);
      oauthProcess = null;
    });

    oauthProcess.on("error", (err) => {
      oauthState.done = true;
      oauthState.error = err.message;
      oauthProcess = null;
    });

    const deadline = Date.now() + 20000;
    while (!oauthState.verificationUrl && !oauthState.done && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
    }

    return NextResponse.json(oauthState);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ done: true, error: msg, output: "" }, { status: 500 });
  }
}
