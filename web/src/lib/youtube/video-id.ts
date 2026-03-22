/** YouTube video IDs are 11 characters from [A-Za-z0-9_-]. */
export function isLikelyYoutubeVideoId(id: string): boolean {
  return /^[\w-]{11}$/.test(id);
}
