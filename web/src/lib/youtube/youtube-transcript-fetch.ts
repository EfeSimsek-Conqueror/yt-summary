/**
 * `youtube-transcript` defaults to an outdated Chrome 85 UA. YouTube often returns
 * HTML without `captionTracks` for that fingerprint (looks like a bot). Railway etc.
 * already use datacenter IPs — a modern browser UA + referer helps.
 *
 * InnerTube `POST /youtubei/v1/player` must keep the library's Android client headers;
 * we do not override those.
 */
const DESKTOP_CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export function youtubeLikeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : (input as Request).url;

  const headers = new Headers(init?.headers);
  const isInnerTube =
    url.includes("/youtubei/v1/player") ||
    url.includes("/youtubei/v1/next") ||
    url.includes("/youtubei/v1/get_transcript");

  if (!isInnerTube) {
    headers.set("User-Agent", DESKTOP_CHROME_UA);
    if (!headers.has("Accept-Language")) {
      headers.set("Accept-Language", "en-US,en;q=0.9,tr;q=0.8");
    }
    if (url.includes("youtube.com") || url.includes("googlevideo.com")) {
      headers.set("Referer", "https://www.youtube.com/");
    }
  }

  return fetch(input, { ...init, headers });
}

/** Pass into every `fetchTranscript(..., { fetch })` call. */
export const transcriptFetchOpts = { fetch: youtubeLikeFetch } as const;
