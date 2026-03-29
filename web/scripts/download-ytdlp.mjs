/**
 * Railway / CI ortamında PATH'te yt-dlp yoksa: resmi release ikilisini node_modules/.bin'e indirir.
 * Başarısız olursa kurulumu düşürmez (nixpacks veya sistem yt-dlp kullanılabilir).
 */
import { chmod, mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dest = join(__dirname, "..", "node_modules", ".bin", "yt-dlp");

/** Asset names: https://github.com/yt-dlp/yt-dlp/releases (linux x64 = `yt-dlp_linux`, mac = `yt-dlp_macos`). */
function assetUrl() {
  if (process.platform === "linux") {
    return process.arch === "arm64"
      ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64"
      : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux";
  }
  if (process.platform === "darwin") {
    return "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos";
  }
  return null;
}

async function main() {
  const url = assetUrl();
  if (!url) {
    console.warn("[postinstall] yt-dlp: skip download on", process.platform);
    return;
  }

  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 10_000) {
      throw new Error("download too small");
    }
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    await chmod(dest, 0o755);
    console.warn("[postinstall] yt-dlp: installed to node_modules/.bin/yt-dlp");
  } catch (e) {
    console.warn(
      "[postinstall] yt-dlp: download failed (use nixpacks or install yt-dlp):",
      e instanceof Error ? e.message : e,
    );
  }
}

main();
