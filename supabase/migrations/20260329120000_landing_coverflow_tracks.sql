-- Landing Cover Flow: public read, editable in Supabase dashboard.
-- Run via Supabase SQL editor or `supabase db push` after linking the project.

create table if not exists public.landing_coverflow_tracks (
  id text primary key,
  sort_order int not null unique,
  title text not null,
  artist text not null,
  youtube_id text not null,
  album_name text,
  year int,
  cover_url text not null,
  created_at timestamptz not null default now()
);

alter table public.landing_coverflow_tracks enable row level security;

drop policy if exists "landing_coverflow_tracks_select_all" on public.landing_coverflow_tracks;
create policy "landing_coverflow_tracks_select_all"
  on public.landing_coverflow_tracks
  for select
  to anon, authenticated
  using (true);

-- YouTube hq thumbnails: always resolvable CDN (swap for iTunes URLs in dashboard if you prefer).
insert into public.landing_coverflow_tracks (id, sort_order, title, artist, youtube_id, album_name, year, cover_url)
values
  ('1', 1, 'Anti-Hero', 'Taylor Swift', 'b1kbLWvqugk', 'Midnights', 2022, 'https://i.ytimg.com/vi/b1kbLWvqugk/hqdefault.jpg'),
  ('2', 2, 'Flowers', 'Miley Cyrus', 'G7KNmW9a75Y', 'Endless Summer Vacation', 2023, 'https://i.ytimg.com/vi/G7KNmW9a75Y/hqdefault.jpg'),
  ('3', 3, 'Unholy', 'Sam Smith', 'Uq9gPaIzbe8', 'Gloria', 2023, 'https://i.ytimg.com/vi/Uq9gPaIzbe8/hqdefault.jpg'),
  ('4', 4, 'As It Was', 'Harry Styles', 'H5v3kku4y6Q', 'Harry''s House', 2022, 'https://i.ytimg.com/vi/H5v3kku4y6Q/hqdefault.jpg'),
  ('5', 5, 'Heat Waves', 'Glass Animals', 'mRD0-GxqHVo', 'Dreamland', 2020, 'https://i.ytimg.com/vi/mRD0-GxqHVo/hqdefault.jpg'),
  ('6', 6, 'Stay', 'The Kid LAROI', 'kTJczUoc26U', 'F*CK LOVE 3: OVER YOU', 2021, 'https://i.ytimg.com/vi/kTJczUoc26U/hqdefault.jpg'),
  ('7', 7, 'Industry Baby', 'Lil Nas X', 'UTHLKHL_whs', 'MONTERO', 2021, 'https://i.ytimg.com/vi/UTHLKHL_whs/hqdefault.jpg'),
  ('25', 8, 'Positions', 'Ariana Grande', 'tcYodQoapMg', 'Positions', 2020, 'https://i.ytimg.com/vi/tcYodQoapMg/hqdefault.jpg'),
  ('8', 9, 'Good 4 U', 'Olivia Rodrigo', 'gNi_6U5Pm_o', 'SOUR', 2021, 'https://i.ytimg.com/vi/gNi_6U5Pm_o/hqdefault.jpg'),
  ('9', 10, 'Levitating', 'Dua Lipa', 'TUVcZfQe-Kw', 'Future Nostalgia', 2020, 'https://i.ytimg.com/vi/TUVcZfQe-Kw/hqdefault.jpg'),
  ('10', 11, 'Blinding Lights', 'The Weeknd', '4NRXx6U8ABQ', 'After Hours', 2020, 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg'),
  ('19', 12, 'Woman', 'Doja Cat', 'aOUkWoXXgTE', 'Planet Her', 2021, 'https://i.ytimg.com/vi/aOUkWoXXgTE/hqdefault.jpg'),
  ('20', 13, 'Shivers', 'Ed Sheeran', 'Il0S8BoucSA', '=', 2021, 'https://i.ytimg.com/vi/Il0S8BoucSA/hqdefault.jpg'),
  ('21', 14, 'Ghost', 'Justice', 'Jrg9KxGNeJY', 'Cross', 2007, 'https://i.ytimg.com/vi/Jrg9KxGNeJY/hqdefault.jpg'),
  ('22', 15, 'Dynamite', 'BTS', 'gdZLi9oWNZg', 'BE', 2020, 'https://i.ytimg.com/vi/gdZLi9oWNZg/hqdefault.jpg')
on conflict (id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  artist = excluded.artist,
  youtube_id = excluded.youtube_id,
  album_name = excluded.album_name,
  year = excluded.year,
  cover_url = excluded.cover_url;
