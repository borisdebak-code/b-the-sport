-- B The Sport: initial sources and entities.
-- feed_url values are CANDIDATES (verified = false). Run `npm run verify-sources`
-- with network access to confirm them; sources without a feed_url are resolved
-- by RSS autodiscovery on their homepage.

insert into public.sources (slug, name, kind, network, region, country, lang, homepage, feed_url) values
-- Hrvatska
('index-sport',        'Index Sport',              'portal', 'rss', 'hr', 'HR', 'hr', 'https://www.index.hr/sport', 'https://www.index.hr/rss/sport'),
('telesport',          'Telesport',                'portal', 'rss', 'hr', 'HR', 'hr', 'https://www.telegram.hr/telesport/', null),
('sportske-novosti',   'Sportske novosti',         'portal', 'rss', 'hr', 'HR', 'hr', 'https://sportske.jutarnji.hr/', null),
('24sata-sport',       '24sata Sport',             'portal', 'rss', 'hr', 'HR', 'hr', 'https://www.24sata.hr/sport', null),
('germanijak',         'Germanijak',               'portal', 'rss', 'hr', 'HR', 'hr', 'https://www.germanijak.hr/', null),
('gol-hr',             'Gol.hr',                   'portal', 'rss', 'hr', 'HR', 'hr', 'https://gol.dnevnik.hr/', null),
('net-hr-sport',       'Net.hr Sport',             'portal', 'rss', 'hr', 'HR', 'hr', 'https://net.hr/sport', null),
('tportal-sport',      'Tportal Sport',            'portal', 'rss', 'hr', 'HR', 'hr', 'https://www.tportal.hr/sport', null),
('jutarnji-sport',     'Jutarnji Sport',           'portal', 'rss', 'hr', 'HR', 'hr', 'https://www.jutarnji.hr/sport', null),
('vecernji-sport',     'Večernji Sport',           'portal', 'rss', 'hr', 'HR', 'hr', 'https://www.vecernji.hr/sport', null),
('hrt-sport',          'HRT Sport',                'portal', 'rss', 'hr', 'HR', 'hr', 'https://www.hrt.hr/sport', null),
('slobodna-sport',     'Slobodna Dalmacija Sport', 'portal', 'rss', 'hr', 'HR', 'hr', 'https://slobodnadalmacija.hr/sport', null),
('novilist-sport',     'Novi list Sport',          'portal', 'rss', 'hr', 'HR', 'hr', 'https://www.novilist.hr/sport/', null),
('sportnet',           'Sportnet.hr',              'portal', 'rss', 'hr', 'HR', 'hr', 'https://sportnet.rtl.hr/', null),
('sportklub-hr',       'Sport Klub HR',            'portal', 'rss', 'hr', 'HR', 'hr', 'https://sportklub.n1info.hr/', null),
('dnevnik-sport',      'Dnevnik.hr Sport',         'portal', 'rss', 'hr', 'HR', 'hr', 'https://dnevnik.hr/sport/', null),
-- Regija
('sportski-zurnal',    'Sportski žurnal',          'portal', 'rss', 'regija', 'RS', 'sr', 'https://zurnal.rs/', null),
('mozzart-sport',      'Mozzart Sport',            'portal', 'rss', 'regija', 'RS', 'sr', 'https://www.mozzartsport.com/', null),
('sportklub-rs',       'Sport Klub RS',            'portal', 'rss', 'regija', 'RS', 'sr', 'https://sportklub.n1info.rs/', null),
('b92-sport',          'B92 Sport',                'portal', 'rss', 'regija', 'RS', 'sr', 'https://www.b92.net/sport', null),
('kurir-sport',        'Kurir Sport',              'portal', 'rss', 'regija', 'RS', 'sr', 'https://www.kurir.rs/sport', null),
('novosti-sport',      'Novosti Sport',            'portal', 'rss', 'regija', 'RS', 'sr', 'https://www.novosti.rs/sport', null),
('klix-sport',         'Klix Sport',               'portal', 'rss', 'regija', 'BA', 'bs', 'https://www.klix.ba/sport', null),
('sportsport-ba',      'SportSport.ba',            'portal', 'rss', 'regija', 'BA', 'bs', 'https://sportsport.ba/', null),
('24ur-sport',         '24ur Šport',               'portal', 'rss', 'regija', 'SI', 'sl', 'https://www.24ur.com/sport', null),
('ekipa',              'Ekipa',                    'portal', 'rss', 'regija', 'SI', 'sl', 'https://ekipa.svet24.si/', null),
('siol-sport',         'Siol Šport',               'portal', 'rss', 'regija', 'SI', 'sl', 'https://siol.net/sportal', null),
('vijesti-sport',      'Vijesti Sport',            'portal', 'rss', 'regija', 'ME', 'cnr', 'https://www.vijesti.me/sport', null),
('cdm-sport',          'CdM Sport',                'portal', 'rss', 'regija', 'ME', 'cnr', 'https://www.cdm.me/sport/', null),
-- Svijet
('bbc-sport',          'BBC Sport',                'portal', 'rss', 'svijet', 'UK', 'en', 'https://www.bbc.com/sport', 'https://feeds.bbci.co.uk/sport/rss.xml'),
('sky-sports',         'Sky Sports',               'portal', 'rss', 'svijet', 'UK', 'en', 'https://www.skysports.com/', 'https://www.skysports.com/rss/12040'),
('guardian-sport',     'The Guardian Sport',       'portal', 'rss', 'svijet', 'UK', 'en', 'https://www.theguardian.com/uk/sport', 'https://www.theguardian.com/uk/sport/rss'),
('espn',               'ESPN',                     'portal', 'rss', 'svijet', 'US', 'en', 'https://www.espn.com/', 'https://www.espn.com/espn/rss/news'),
('goal',               'Goal',                     'portal', 'rss', 'svijet', 'INT', 'en', 'https://www.goal.com/en', null),
('marca',              'Marca',                    'portal', 'rss', 'svijet', 'ES', 'es', 'https://www.marca.com/', 'https://e00-marca.uecdn.es/rss/portada.xml'),
('as',                 'AS',                       'portal', 'rss', 'svijet', 'ES', 'es', 'https://as.com/', 'https://feeds.as.com/mrss-s/pages/as/site/as.com/portada/'),
('mundo-deportivo',    'Mundo Deportivo',          'portal', 'rss', 'svijet', 'ES', 'es', 'https://www.mundodeportivo.com/', null),
('gazzetta',           'La Gazzetta dello Sport',  'portal', 'rss', 'svijet', 'IT', 'it', 'https://www.gazzetta.it/', 'https://www.gazzetta.it/rss/home.xml'),
('corriere-sport',     'Corriere dello Sport',     'portal', 'rss', 'svijet', 'IT', 'it', 'https://www.corrieredellosport.it/', null),
('lequipe',            'L''Équipe',                'portal', 'rss', 'svijet', 'FR', 'fr', 'https://www.lequipe.fr/', 'https://dwh.lequipe.fr/api/edito/rss?path=/'),
('kicker',             'Kicker',                   'portal', 'rss', 'svijet', 'DE', 'de', 'https://www.kicker.de/', 'https://newsfeed.kicker.de/news/aktuell'),
('bild-sport',         'Bild Sport',               'portal', 'rss', 'svijet', 'DE', 'de', 'https://www.bild.de/sport/', null),
('a-bola',             'A Bola',                   'portal', 'rss', 'svijet', 'PT', 'pt', 'https://www.abola.pt/', null),
('record',             'Record',                   'portal', 'rss', 'svijet', 'PT', 'pt', 'https://www.record.pt/', null);

-- YouTube channels (phase 1 social source). Channel IDs are resolved from the
-- handle by the verify script, which then stores the channel RSS feed URL.
insert into public.sources (slug, name, kind, network, region, country, lang, homepage, handle, default_sport, reliability) values
('yt-fabrizio-romano', 'Fabrizio Romano',     'social', 'youtube', 'svijet', 'INT', 'en', 'https://www.youtube.com/@FabrizioRomanoYT', 'FabrizioRomanoYT', 'nogomet', 1),
('yt-433',             '433',                 'social', 'youtube', 'svijet', 'INT', 'en', 'https://www.youtube.com/@433',              '433',              'nogomet', 3),
('yt-onefootball',     'OneFootball',         'social', 'youtube', 'svijet', 'INT', 'en', 'https://www.youtube.com/@OneFootball',      'OneFootball',      'nogomet', 3),
('yt-golazo',          'CBS Sports Golazo',   'social', 'youtube', 'svijet', 'US',  'en', 'https://www.youtube.com/@CBSSportsGolazo',  'CBSSportsGolazo',  'nogomet', 3),
('yt-espnfc',          'ESPN FC',             'social', 'youtube', 'svijet', 'US',  'en', 'https://www.youtube.com/@ESPNFC',           'ESPNFC',           'nogomet', 3),
('yt-nba',             'NBA',                 'social', 'youtube', 'svijet', 'US',  'en', 'https://www.youtube.com/@NBA',              'NBA',              'kosarka', 1),
('yt-euroleague',      'EuroLeague',          'social', 'youtube', 'svijet', 'INT', 'en', 'https://www.youtube.com/@EuroLeague',       'EuroLeague',       'kosarka', 1),
('yt-ehf',             'EHF',                 'social', 'youtube', 'svijet', 'INT', 'en', 'https://www.youtube.com/@EHFTV',            'EHFTV',            'rukomet', 1),
('yt-atp',             'ATP Tour',            'social', 'youtube', 'svijet', 'INT', 'en', 'https://www.youtube.com/@ATPTour',          'ATPTour',          'tenis',   1),
('yt-wta',             'WTA',                 'social', 'youtube', 'svijet', 'INT', 'en', 'https://www.youtube.com/@WTA',              'WTA',              'tenis',   1),
('yt-f1',              'Formula 1',           'social', 'youtube', 'svijet', 'INT', 'en', 'https://www.youtube.com/@Formula1',         'Formula1',         'f1moto',  1),
('yt-ufc',             'UFC',                 'social', 'youtube', 'svijet', 'US',  'en', 'https://www.youtube.com/@UFC',              'UFC',              'borilacki', 1),
('yt-hns',             'HNS / Vatreni',       'social', 'youtube', 'hr',     'HR',  'hr', 'https://www.youtube.com/@HNSCFF',           'HNSCFF',           'nogomet', 1);

update public.sources set reliability = 1 where slug in ('bbc-sport', 'guardian-sport');

-- Croatian athletes abroad ("Hrvati u svijetu"). Aliases are lowercase, unaccented.
insert into public.entities (name, kind, sport, aliases, croat_abroad) values
('Luka Modrić',        'athlete', 'nogomet', '{modric}', true),
('Joško Gvardiol',     'athlete', 'nogomet', '{gvardiol}', true),
('Mateo Kovačić',      'athlete', 'nogomet', '{kovacic}', true),
('Andrej Kramarić',    'athlete', 'nogomet', '{kramaric}', true),
('Ivan Perišić',       'athlete', 'nogomet', '{perisic}', true),
('Mario Pašalić',      'athlete', 'nogomet', '{pasalic}', true),
('Josip Stanišić',     'athlete', 'nogomet', '{stanisic}', true),
('Josip Šutalo',       'athlete', 'nogomet', '{sutalo}', true),
('Luka Sučić',         'athlete', 'nogomet', '{"luka sucic"}', true),
('Martin Baturina',    'athlete', 'nogomet', '{baturina}', true),
('Ante Budimir',       'athlete', 'nogomet', '{budimir}', true),
('Dominik Livaković',  'athlete', 'nogomet', '{livakovic}', true),
('Ivica Zubac',        'athlete', 'kosarka', '{zubac}', true),
('Dario Šarić',        'athlete', 'kosarka', '{"dario saric"}', true),
('Bojan Bogdanović',   'athlete', 'kosarka', '{"bojan bogdanovic"}', true),
('Domagoj Duvnjak',    'athlete', 'rukomet', '{duvnjak}', true),
('Luka Cindrić',       'athlete', 'rukomet', '{cindric}', true),
('Igor Karačić',       'athlete', 'rukomet', '{karacic}', true),
('Marin Čilić',        'athlete', 'tenis',   '{cilic}', true),
('Donna Vekić',        'athlete', 'tenis',   '{vekic}', true),
('Dino Prižmić',       'athlete', 'tenis',   '{prizmic}', true);
