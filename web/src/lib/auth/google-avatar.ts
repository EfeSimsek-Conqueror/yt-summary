import type { User } from "@supabase/supabase-js";

/** Last resort: any metadata URL that looks like a Google / profile image. */
function scanMetadataForProfileImage(
  obj: Record<string, unknown> | null | undefined,
): string | null {
  if (!obj || typeof obj !== "object") return null;
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val !== "string" || val.length < 12) continue;
    const v = val.trim();
    if (!v.startsWith("http")) continue;
    if (/picture|avatar|photo|image|thumb|profile/i.test(key)) return v;
    if (v.includes("googleusercontent.com") || v.includes("ggpht.com")) return v;
  }
  return null;
}

/**
 * Google OIDC puts the profile photo in `picture` (OpenID standard).
 * Supabase may also copy it to `avatar_url`. Identity rows keep the same keys.
 */
export function getAvatarUrlFromUser(user: User): string | null {
  const m = user.user_metadata;
  if (m && typeof m === "object") {
    const rec = m as Record<string, unknown>;
    const fromMeta = [rec.picture, rec.avatar_url];
    for (const u of fromMeta) {
      if (typeof u === "string" && u.trim().length > 0) return u.trim();
    }
    const scanned = scanMetadataForProfileImage(rec);
    if (scanned) return scanned;
  }
  for (const id of user.identities ?? []) {
    const d = id.identity_data;
    if (!d || typeof d !== "object") continue;
    const idRec = d as Record<string, unknown>;
    const fromId = [idRec.picture, idRec.avatar_url];
    for (const u of fromId) {
      if (typeof u === "string" && u.trim().length > 0) return u.trim();
    }
    const scanned = scanMetadataForProfileImage(idRec);
    if (scanned) return scanned;
  }
  return null;
}

export function getInitialsFromUser(user: User): string {
  const name = user.user_metadata?.full_name;
  if (typeof name === "string" && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
    }
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  const e = user.email ?? "?";
  return e.slice(0, 2).toUpperCase();
}
