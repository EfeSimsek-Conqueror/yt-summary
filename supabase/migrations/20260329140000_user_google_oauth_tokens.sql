-- Persist Google OAuth refresh tokens. Supabase JWT refresh replaces the session
-- cookie without provider_token; we re-issue Google access tokens with the same
-- OAuth client used in Supabase (GOOGLE_OAUTH_CLIENT_ID / SECRET on the app).

CREATE TABLE public.user_google_oauth_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  refresh_token text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_google_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_google_oauth_tokens_select_own"
  ON public.user_google_oauth_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_google_oauth_tokens_insert_own"
  ON public.user_google_oauth_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_google_oauth_tokens_update_own"
  ON public.user_google_oauth_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_google_oauth_tokens_delete_own"
  ON public.user_google_oauth_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_google_oauth_tokens IS
  'Google OAuth refresh token for YouTube Data API after Supabase clears provider_token.';
