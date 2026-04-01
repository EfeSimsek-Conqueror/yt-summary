-- Replace duplicate Dua Lipa slot (id 19 was Physical) with Maroon 5 — Moves Like Jagger.

update public.landing_coverflow_tracks set
  title = 'Moves Like Jagger',
  artist = 'Maroon 5 ft. Christina Aguilera',
  youtube_id = 'iEPTlhBmwRg',
  album_name = 'Hands All Over',
  year = 2011,
  cover_url = 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/5f/6e/4c/5f6e4c8b-eba6-f722-caf4-c5773dea7fa1/14UMGIM27067.rgb.jpg/600x600bb.jpg'
where id = '19';
