-- Instagram (Graph API, Business Discovery) through the owner's Creator account.

-- Private settings written by the ingest function (no RLS policy: only the service role reads it).
create table if not exists public.integration_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table public.integration_settings enable row level security;
revoke all on public.integration_settings from anon, authenticated;

-- Public Instagram accounts to follow (must be Business or Creator accounts).
insert into public.sources (slug, name, kind, network, region, country, lang, homepage, handle, default_sport, reliability) values
('ig-fabrizioromano', 'Fabrizio Romano',    'social', 'instagram', 'svijet', 'INT', 'en', 'https://www.instagram.com/fabrizioromano/', 'fabrizioromano', 'nogomet',   1),
('ig-433',            '433',                'social', 'instagram', 'svijet', 'INT', 'en', 'https://www.instagram.com/433/',            '433',            'nogomet',   3),
('ig-onefootball',    'OneFootball',        'social', 'instagram', 'svijet', 'INT', 'en', 'https://www.instagram.com/onefootball/',    'onefootball',    'nogomet',   3),
('ig-golazo',         'CBS Sports Golazo',  'social', 'instagram', 'svijet', 'US',  'en', 'https://www.instagram.com/cbssportsgolazo/','cbssportsgolazo','nogomet',   3),
('ig-espnfc',         'ESPN FC',            'social', 'instagram', 'svijet', 'US',  'en', 'https://www.instagram.com/espnfc/',         'espnfc',         'nogomet',   3),
('ig-brfootball',     'B/R Football',       'social', 'instagram', 'svijet', 'US',  'en', 'https://www.instagram.com/brfootball/',     'brfootball',     'nogomet',   3),
('ig-skysportsnews',  'Sky Sports News',    'social', 'instagram', 'svijet', 'UK',  'en', 'https://www.instagram.com/skysportsnews/',  'skysportsnews',  'nogomet',   2),
('ig-hns',            'HNS / Vatreni',      'social', 'instagram', 'hr',     'HR',  'hr', 'https://www.instagram.com/hns_cff/',        'hns_cff',        'nogomet',   1),
('ig-nba',            'NBA',                'social', 'instagram', 'svijet', 'US',  'en', 'https://www.instagram.com/nba/',            'nba',            'kosarka',   1),
('ig-euroleague',     'EuroLeague',         'social', 'instagram', 'svijet', 'INT', 'en', 'https://www.instagram.com/euroleague/',     'euroleague',     'kosarka',   1),
('ig-ehf',            'EHF Champions League','social','instagram', 'svijet', 'INT', 'en', 'https://www.instagram.com/ehfcl/',          'ehfcl',          'rukomet',   1),
('ig-f1',             'Formula 1',          'social', 'instagram', 'svijet', 'INT', 'en', 'https://www.instagram.com/f1/',             'f1',             'f1moto',    1),
('ig-ufc',            'UFC',                'social', 'instagram', 'svijet', 'US',  'en', 'https://www.instagram.com/ufc/',            'ufc',            'borilacki', 1)
on conflict (slug) do nothing;
