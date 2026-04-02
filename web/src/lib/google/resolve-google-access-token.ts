import { createClient } from "@/lib/supabase/server";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

const TABLE = "user_google_oauth_tokens";

/** Call after exchangeCodeForSession so JWT refresh can still reach YouTube APIs. */
export async function persistGoogleRefreshTokenIfPresent(
  supabase: SupabaseClient,
  session: Session | null,
): Promise<void> {
  if (!session?.user?.id || !session.provider_refresh_token) return;
  await supabase.from(TABLE).upsert(
    {
      user_id: session.user.id,
      refresh_token: session.provider_refresh_token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

function googleOAuthClientCredentials(): { id: string; secret: string } | null {
  const id =
    process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
  const secret =
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
  if (!id.trim() || !secret.trim()) return null;
  return { id: id.trim(), secret: secret.trim() };
}

/**
 * Resolves a Google OAuth access token for YouTube / userinfo calls.
 * 1) Uses session.provider_token when present (fresh OAuth).
 * 2) Otherwise exchanges a stored refresh token (JWT refresh drops provider_token).
 */
export async function resolveGoogleAccessToken(
  supabase: SupabaseClient,
  session: Session | null,
): Promise<string | null> {
  if (!session?.user) return null;

  if (session.provider_token) {
    return session.provider_token;
  }

  const { data: row } = await supabase
    .from(TABLE)
    .select("refresh_token")
    .eq("user_id", session.user.id)
    .maybeSingle();

  const storedRefresh = row?.refresh_token as string | undefined;
  const refreshToken =
    session.provider_refresh_token ?? storedRefresh ?? null;
  if (!refreshToken) return null;

  const creds = googleOAuthClientCredentials();
  if (!creds) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.id,
      client_secret: creds.secret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const json = (await res.json()) as {
    access_token?: string;
    error?: string;
  };

  if (!res.ok || !json.access_token) {
    if (json.error === "invalid_grant") {
      await supabase.from(TABLE).delete().eq("user_id", session.user.id);
    }
    return null;
  }

  if (session.provider_refresh_token && !storedRefresh) {
    await supabase.from(TABLE).upsert(
      {
        user_id: session.user.id,
        refresh_token: session.provider_refresh_token,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }

  return json.access_token;
}

/**
 * Per-request deduplication for Server Components (Discover loads channels + many searches).
 */
export const getResolvedGoogleAccessToken = cache(
  async (): Promise<string | null> => {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return resolveGoogleAccessToken(supabase, session);
  },
);
