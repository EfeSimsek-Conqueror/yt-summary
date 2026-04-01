-- Fix invalid video IDs (typo / non-existent) and embed-restricted Ghost track.
-- Anti-Hero: W vs w in ID; Woman: wrong ID; Ghost: use embeddable official video + metadata.

update public.landing_coverflow_tracks
set youtube_id = 'b1kbLwvqugk'
where id = '1';

update public.landing_coverflow_tracks
set youtube_id = 'yxW5yuzVi8w'
where id = '19';

update public.landing_coverflow_tracks
set
  youtube_id = 'Fp8msa5uYsc',
  artist = 'Justin Bieber',
  album_name = 'Justice',
  year = 2021
where id = '21';
