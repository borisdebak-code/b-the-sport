-- Portals without RSS: headlines from a section page (network 'html').
alter table public.sources add column if not exists link_pattern text; -- regex on the link path

update public.sources set network = 'html', verified = true, last_error = null, feed_url = 'https://www.germanijak.hr/',
  link_pattern = '/vijesti/[a-z0-9-]+/[0-9]+$' where slug = 'germanijak';
update public.sources set network = 'html', verified = true, last_error = null, feed_url = 'https://www.corrieredellosport.it/',
  link_pattern = '^/news/[a-z0-9-]+/.+/[0-9]{4}/[0-9]{2}/[0-9]{2}-[0-9]+/' where slug = 'corriere-sport';
update public.sources set network = 'html', verified = true, last_error = null, feed_url = 'https://www.record.pt/',
  link_pattern = '^/(futebol|modalidades)/.+/detalhe/[a-z0-9-]+$' where slug = 'record';
update public.sources set network = 'html', verified = true, last_error = null, feed_url = 'https://siol.net/sportal',
  link_pattern = '^/sportal/[a-z-]+/[a-z0-9-]+-[0-9]{5,}$' where slug = 'siol-sport';
update public.sources set network = 'html', verified = true, last_error = null, feed_url = 'https://ekipa.svet24.si/',
  link_pattern = '^/sport/.+-[0-9]{6,}$' where slug = 'ekipa';
-- CdM has a general RSS feed; keep only the sports section.
update public.sources set network = 'rss', verified = true, last_error = null, feed_url = 'https://www.cdm.me/feed/',
  item_url_filter = '/sport/' where slug = 'cdm-sport';
-- Not usable without a browser (JavaScript-only page, 404 for bots, blocked, betting widgets only).
update public.sources set enabled = false, last_error = 'no RSS and no readable section page'
  where slug in ('sportnet', 'goal', 'bild-sport', 'sportsport-ba', 'mozzart-sport');
update public.sources set enabled = false, last_error = 'HTTP 403 for servers' where slug = 'cdm-sport';
