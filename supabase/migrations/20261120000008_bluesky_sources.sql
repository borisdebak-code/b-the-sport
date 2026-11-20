-- Bluesky: only accounts verified by their own domain (no fan or impersonator accounts).
insert into public.sources (slug, name, kind, network, region, country, lang, homepage, handle, default_sport, reliability, verified) values
('bsky-the-athletic', 'The Athletic',  'social', 'bluesky', 'svijet', 'US', 'en', 'https://bsky.app/profile/theathletic.com',       'theathletic.com',       null,        2, true),
('bsky-guardian',     'Guardian Sport','social', 'bluesky', 'svijet', 'UK', 'en', 'https://bsky.app/profile/sport.theguardian.com', 'sport.theguardian.com', null,        2, true),
('bsky-bloody-elbow', 'Bloody Elbow',  'social', 'bluesky', 'svijet', 'US', 'en', 'https://bsky.app/profile/bloodyelbow.com',       'bloodyelbow.com',       'borilacki', 3, true)
on conflict (slug) do nothing;
