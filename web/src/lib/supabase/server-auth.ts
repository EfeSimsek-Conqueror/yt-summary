import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

/**
 * Supabase Auth user verified with the Auth server (not just cookie JWT).
 * Deduplicated per request — use for gates instead of `getSession().user`.
 */
export const getServerAuthUser = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getUser();
});
