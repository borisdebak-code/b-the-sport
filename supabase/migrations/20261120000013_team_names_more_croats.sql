-- 1) Favourites in Rezultati: API-Sports team names per followed club / national team.
alter table public.entities add column if not exists team_names text[] not null default '{}';

update public.entities set team_names = '{"Dinamo Zagreb"}'        where name = 'GNK Dinamo';
update public.entities set team_names = '{"HNK Hajduk Split"}'     where name = 'HNK Hajduk';
update public.entities set team_names = '{"HNK Rijeka"}'           where name = 'HNK Rijeka';
update public.entities set team_names = '{"NK Osijek"}'            where name = 'NK Osijek';
update public.entities set team_names = '{"Real Madrid"}'          where name = 'Real Madrid';
update public.entities set team_names = '{"Barcelona"}'            where name = 'FC Barcelona';
update public.entities set team_names = '{"Manchester City"}'      where name = 'Manchester City';
update public.entities set team_names = '{"Manchester United"}'    where name = 'Manchester United';
update public.entities set team_names = '{"Liverpool"}'            where name = 'Liverpool';
update public.entities set team_names = '{"Arsenal"}'              where name = 'Arsenal';
update public.entities set team_names = '{"Chelsea"}'              where name = 'Chelsea';
update public.entities set team_names = '{"Bayern München"}'       where name = 'Bayern';
update public.entities set team_names = '{"Inter"}'                where name = 'Inter';
update public.entities set team_names = '{"AC Milan"}'             where name = 'AC Milan';
update public.entities set team_names = '{"Juventus"}'             where name = 'Juventus';
update public.entities set team_names = '{"Paris Saint Germain"}'  where name = 'PSG';
update public.entities set team_names = '{"Cibona"}'               where name = 'KK Cibona';
update public.entities set team_names = '{"Cedevita Olimpija"}'    where name = 'KK Cedevita Olimpija';
update public.entities set team_names = '{"Zadar"}'                where name = 'KK Zadar';
update public.entities set team_names = '{"RK Zagreb"}'            where name = 'RK Zagreb';
update public.entities set team_names = '{"Los Angeles Lakers"}'   where name = 'Los Angeles Lakers';
update public.entities set team_names = '{"Los Angeles Clippers"}' where name = 'LA Clippers';
update public.entities set team_names = '{"Croatia"}'              where kind = 'national_team';

create or replace view public.followable_entities
with (security_invoker = true) as
  select id, name, kind, sport, team_names from public.entities;
grant select on public.followable_entities to anon, authenticated;

-- 2) More Croatian athletes abroad ("Hrvati u svijetu"). Aliases are normalised the way
--    normalize_title does it: lowercase, no diacritics, other characters become spaces.
insert into public.entities (name, kind, sport, aliases, croat_abroad) values
('Nikola Vlašić',       'athlete', 'nogomet', '{"nikola vlasic"}', true),
('Lovro Majer',         'athlete', 'nogomet', '{majer}', true),
('Josip Juranović',     'athlete', 'nogomet', '{juranovic}', true),
('Martin Erlić',        'athlete', 'nogomet', '{erlic}', true),
('Kristijan Jakić',     'athlete', 'nogomet', '{jakic}', true),
('Marin Pongračić',     'athlete', 'nogomet', '{pongracic}', true),
('Duje Ćaleta-Car',     'athlete', 'nogomet', '{"caleta car"}', true),
('Luka Ivanušec',       'athlete', 'nogomet', '{ivanusec}', true),
('Borna Sosa',          'athlete', 'nogomet', '{"borna sosa"}', true),
('Igor Matanović',      'athlete', 'nogomet', '{matanovic}', true),
('Franjo Ivanović',     'athlete', 'nogomet', '{"franjo ivanovic"}', true),
('Petar Musa',          'athlete', 'nogomet', '{"petar musa"}', true),
('Ante Rebić',          'athlete', 'nogomet', '{rebic}', true),
('Mislav Oršić',        'athlete', 'nogomet', '{orsic}', true),
('Nikola Moro',         'athlete', 'nogomet', '{"nikola moro"}', true),
('Mario Hezonja',       'athlete', 'kosarka', '{hezonja}', true),
('Roko Prkačin',        'athlete', 'kosarka', '{prkacin}', true),
('Ante Žižić',          'athlete', 'kosarka', '{zizic}', true),
('Ivan Martinović',     'athlete', 'rukomet', '{"ivan martinovic"}', true),
('Mario Šoštarić',      'athlete', 'rukomet', '{sostaric}', true),
('Luka Lovre Klarica',  'athlete', 'rukomet', '{klarica}', true),
('Borna Ćorić',         'athlete', 'tenis',   '{coric}', true),
('Petra Martić',        'athlete', 'tenis',   '{"petra martic"}', true),
('Mate Pavić',          'athlete', 'tenis',   '{"mate pavic"}', true),
('Nikola Mektić',       'athlete', 'tenis',   '{mektic}', true),
('Ivan Dodig',          'athlete', 'tenis',   '{dodig}', true),
('Zrinka Ljutić',       'athlete', 'zimski',  '{ljutic}', true),
('Filip Zubčić',        'athlete', 'zimski',  '{zubcic}', true);
