-- Square iTunes artwork (600×600) — YouTube hqdefault is 16:9 with letterboxing in Cover Flow.

update public.landing_coverflow_tracks set
  cover_url = 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/5f/6e/4c/5f6e4c8b-eba6-f722-caf4-c5773dea7fa1/14UMGIM27067.rgb.jpg/600x600bb.jpg'
where id = '19';
