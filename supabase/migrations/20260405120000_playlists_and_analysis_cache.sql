-- Saved playlists
create table if not exists user_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table user_playlists enable row level security;
create policy "Users can manage own playlists" on user_playlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Videos inside saved playlists
create table if not exists playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid references user_playlists on delete cascade not null,
  video_id text not null,
  title text,
  thumbnail_url text,
  duration_sec int,
  channel_title text,
  published_at timestamptz,
  position int not null default 0,
  added_at timestamptz default now() not null
);

alter table playlist_items enable row level security;
create policy "Users can manage own playlist items" on playlist_items
  for all using (
    playlist_id in (select id from user_playlists where user_id = auth.uid())
  ) with check (
    playlist_id in (select id from user_playlists where user_id = auth.uid())
  );

-- Cached AI analysis results (avoids re-analyzing + re-charging credits)
create table if not exists video_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  video_id text not null,
  language text not null default 'en',
  analysis jsonb not null,
  created_at timestamptz default now() not null,
  unique(user_id, video_id, language)
);

alter table video_analyses enable row level security;
create policy "Users can read own analyses" on video_analyses
  for select using (auth.uid() = user_id);
create policy "Users can insert own analyses" on video_analyses
  for insert with check (auth.uid() = user_id);
