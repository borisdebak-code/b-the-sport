-- Results come from two providers: ESPN's public scoreboard (no key) for the competitions
-- it covers, API-Sports for the rest (HNL, Croatian/ABA/Euroleague basketball, handball).
alter table public.result_leagues add column if not exists provider text not null default 'api-sports'
  check (provider in ('api-sports', 'espn'));
alter table public.result_leagues add column if not exists espn_code text;  -- e.g. 'eng.1', 'nba'

update public.result_leagues set provider = 'espn', espn_code = c.code
from (values
  ('nogomet', 2,   'uefa.champions'),
  ('nogomet', 3,   'uefa.europa'),
  ('nogomet', 848, 'uefa.europa.conf'),
  ('nogomet', 5,   'uefa.nations'),
  ('nogomet', 39,  'eng.1'),
  ('nogomet', 140, 'esp.1'),
  ('nogomet', 135, 'ita.1'),
  ('nogomet', 78,  'ger.1'),
  ('nogomet', 61,  'fra.1'),
  ('nogomet', 253, 'usa.1'),
  ('kosarka', 12,  'nba')
) as c(sport, league_id, code)
where result_leagues.sport = c.sport and result_leagues.league_id = c.league_id;

-- API-Sports can be switched off (e.g. while the account is suspended) without a deploy.
insert into public.integration_settings (key, value) values ('api_sports_enabled', 'false')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Rows from API-Sports for competitions now served by ESPN would show twice.
delete from public.matches m using public.result_leagues l
 where l.provider = 'espn' and m.sport = l.sport and m.league_id = l.league_id and m.id not like 'espn:%';

-- ESPN spells some teams differently; favourites match either name.
update public.entities set team_names = team_names || '{"Bayern Munich"}'        where name = 'Bayern' and not 'Bayern Munich' = any(team_names);
update public.entities set team_names = team_names || '{"Paris Saint-Germain"}'  where name = 'PSG' and not 'Paris Saint-Germain' = any(team_names);
update public.entities set team_names = team_names || '{"Internazionale"}'       where name = 'Inter' and not 'Internazionale' = any(team_names);
update public.entities set team_names = team_names || '{"LA Clippers"}'          where name = 'LA Clippers' and not 'LA Clippers' = any(team_names);
update public.entities set team_names = team_names || '{"GNK Dinamo Zagreb"}'    where name = 'GNK Dinamo' and not 'GNK Dinamo Zagreb' = any(team_names);
