/**
 * OAuth redirect path (PKCE exchange). Use this in Supabase Redirect URLs as
 * `${origin}/oauth/return` (and Railway URL until custom domain works).
 * Legacy `/auth/callback` still forwards here.
 */
export const OAUTH_CALLBACK_PATH = "/oauth/return";
