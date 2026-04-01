-- Replace Anti-Hero / Woman / Ghost with embed-friendly, verified tracks (ids unchanged for sort_order).

update public.landing_coverflow_tracks set
  title = 'Shake It Off',
  artist = 'Taylor Swift',
  youtube_id = 'nfWlot6h_JM',
  album_name = '1989 (Deluxe Edition)',
  year = 2014,
  cover_url = 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/a7/98/d8/a798d867-344d-2bf2-fbfe-d2d1412dcef8/14UMDIM03793.rgb.jpg/600x600bb.jpg'
where id = '1';

update public.landing_coverflow_tracks set
  title = 'Physical',
  artist = 'Dua Lipa',
  youtube_id = '9HDEHj2yzew',
  album_name = 'Future Nostalgia',
  year = 2020,
  cover_url = 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/600x600bb.jpg'
where id = '19';

update public.landing_coverflow_tracks set
  title = 'Uptown Funk',
  artist = 'Mark Ronson ft. Bruno Mars',
  youtube_id = 'fRh_vgS2dFE',
  album_name = 'Uptown Special',
  year = 2014,
  cover_url = 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/7e/30/c5/7e30c572-aa47-5f7b-c6fd-42d50cd2c56d/886444959797.jpg/600x600bb.jpg'
where id = '21';
