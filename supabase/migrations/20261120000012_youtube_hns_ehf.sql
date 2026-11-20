-- Correct YouTube channels for HNS (HNSTV) and EHF (The Home of Handball).
update public.sources set homepage = 'https://www.youtube.com/@hnstv', handle = 'hnstv',
  feed_url = 'https://www.youtube.com/feeds/videos.xml?channel_id=UC0xJnpjY2FVNql7fuqvQZow', verified = true, last_error = null
  where slug = 'yt-hns';
update public.sources set name = 'EHF (Home of Handball)', homepage = 'https://www.youtube.com/@homeofhandball', handle = 'homeofhandball',
  feed_url = 'https://www.youtube.com/feeds/videos.xml?channel_id=UC5F7T3y7PF_1A3JvHfgm5rQ', verified = true, last_error = null
  where slug = 'yt-ehf';
