import { vidError, vidLog } from "@/lib/server/vid-log";
import { createClient } from "@/lib/supabase/server";
import { getServerAuthUser } from "@/lib/supabase/server-auth";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

const TABLE = "user_google_oauth_tokens";

/** Call after exchangeCodeForSession so JWT refresh can still reach YouTube APIs. */
export async function persistGoogleRefreshTokenIfPresent(
  supabase: SupabaseClient,
  session: Session | null,
): Promise<void> {
  if (!session?.user?.id || !session.provider_refresh_token) return;
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: session.user.id,
      refresh_token: session.provider_refresh_token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    vidError("google-token", "failed to persist refresh token row", {
      message: error.message,
      code: error.code,
    });
  } else {
    vidLog("google-token", "stored refresh token for user", {
      userId: session.user.id,
    });
  }
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
  if (!refreshToken) {
    vidLog("google-token", "no refresh token available", {
      userId: session.user.id,
      hasSessionRefresh: Boolean(session.provider_refresh_token),
      hasStoredRefresh: Boolean(storedRefresh),
    });
    return null;
  }

  const creds = googleOAuthClientCredentials();
  if (!creds) {
    vidError("google-token", "missing GOOGLE_OAUTH_CLIENT_ID/SECRET for refresh", {
      userId: session.user.id,
    });
    return null;
  }

  vidLog("google-token", "refreshing access token via Google OAuth", {
    userId: session.user.id,
    usedStoredRow: Boolean(storedRefresh),
  });

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
    vidError("google-token", "Google token endpoint failed", {
      userId: session.user.id,
      httpStatus: res.status,
      error: json.error ?? null,
    });
    if (json.error === "invalid_grant") {
      await supabase.from(TABLE).delete().eq("user_id", session.user.id);
      vidLog("google-token", "cleared stored refresh after invalid_grant", {
        userId: session.user.id,
      });
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
    const { data: { user }, error } = await getServerAuthUser();
    if (error || !user) return null;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return resolveGoogleAccessToken(supabase, session);
  },
);
