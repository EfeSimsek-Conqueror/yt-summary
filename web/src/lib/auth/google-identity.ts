import type { User } from "@supabase/supabase-js";

/** True if the Supabase user has a linked Google identity (Sign in with Google). */
export function userHasGoogleIdentity(user: User | null | undefined): boolean {
  return Boolean(user?.identities?.some((i) => i.provider === "google"));
}
