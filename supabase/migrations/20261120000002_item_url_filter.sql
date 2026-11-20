-- Portals whose only feed is a general news feed: keep just items whose URL
-- matches this pattern (e.g. '/sport/').
alter table public.sources add column if not exists item_url_filter text;
