-- Search, transfer reliability and match results.

-- Transfer stage, detected from the text at ingest:
-- 'sluzbeno' (official / here we go), 'dogovor' (agreement), 'pregovori' (talks), 'glasina' (rumour).
alter table public.items add column if not exists transfer_stage text
  check (transfer_stage in ('sluzbeno', 'dogovor', 'pregovori', 'glasina'));

-- Reliability of sources for transfer news: 1 very reliable, 2 reliable, 3 media/aggregator.
update public.sources set reliability = 2 where slug in ('bbc-sport', 'guardian-sport', 'sky-sports', 'kicker', 'lequipe', 'gazzetta');
update public.sources set reliability = 1 where slug in ('yt-fabrizio-romano', 'yt-hns', 'yt-nba', 'yt-euroleague', 'yt-ehf', 'yt-atp', 'yt-wta', 'yt-f1', 'yt-ufc');

-- Match results (API-Sports), refreshed by the `results` function.
create table if not exists public.matches (
  id           text primary key,          -- '<sport>:<api id>'
  sport        text not null,
  league_id    integer not null,
  league_name  text not null,
  country      text,
  league_logo  text,
  round        text,
  home         text not null,
  away         text not null,
  home_logo    text,
  away_logo    text,
  home_score   integer,
  away_score   integer,
  status       text not null,             -- API short status: NS, 1H, HT, 2H, FT, Q1..., AOT, PST ...
  status_long  text,
  elapsed      integer,
  starts_at    timestamptz not null,
  updated_at   timestamptz not null default now()
);
create index if not exists matches_sport_starts_idx on public.matches (sport, starts_at);
alter table public.matches enable row level security;
create policy "read matches" on public.matches for select to anon, authenticated using (true);

-- Competitions shown in Rezultati (API-Sports league ids per sport), editable.
create table if not exists public.result_leagues (
  sport     text not null,
  league_id integer not null,
  name      text not null,
  priority  integer not null default 50,   -- lower = shown first
  primary key (sport, league_id)
);
alter table public.result_leagues enable row level security;
create policy "read result_leagues" on public.result_leagues for select to anon, authenticated using (true);

-- get_feed: adds text search and returns reliability / transfer stage.
drop function if exists public.get_feed(text, text, text[], boolean, text, bigint[], timestamptz, integer, bigint[], boolean);
create or replace function public.get_feed(
  p_kind text,
  p_region text default null,
  p_sports text[] default null,
  p_croats_abroad boolean default false,
  p_network text default null,
  p_hidden_sources bigint[] default '{}',
  p_before timestamptz default null,
  p_limit integer default 30,
  p_entity_ids bigint[] default null,
  p_transfers boolean default false,
  p_search text default null,            -- words that must appear in the (translated) title
  p_min_reliability integer default null -- Transfer centar: only sources at this level or better
)
returns table (
  cluster_id   bigint,
  updated_at   timestamptz,
  sport        text,
  item_id      bigint,
  title        text,
  summary      text,
  translated   boolean,
  original_title text,
  url          text,
  image_url    text,
  published_at timestamptz,
  source_name  text,
  source_network text,
  source_count integer,
  others       jsonb,
  source_reliability integer,
  transfer_stage text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with terms as (
    select array_remove(string_to_array(public.normalize_title(p_search), ' '), '') as words
  ),
  matching as (
    select i.*, s.name as source_name, s.network as source_network, s.reliability as source_reliability,
           row_number() over (partition by i.cluster_id order by s.reliability asc, s.region = 'hr' desc, i.published_at asc) as rn
    from public.items i
    join public.sources s on s.id = i.source_id
    cross join terms t
    where (p_kind is null or s.kind = p_kind)
      and s.enabled
      and i.cluster_id is not null
      and not (s.id = any (p_hidden_sources))
      and (p_region is null or s.region = p_region)
      and (p_sports is null or i.sport = any (p_sports))
      and (not p_croats_abroad or i.croats_abroad)
      and (p_network is null or s.network = p_network)
      and (not p_transfers or i.is_transfer)
      and (p_min_reliability is null or s.reliability <= p_min_reliability)
      and (p_entity_ids is null or exists (
            select 1 from public.item_entities ie where ie.item_id = i.id and ie.entity_id = any (p_entity_ids)))
      and (p_search is null or coalesce(cardinality(t.words), 0) = 0 or not exists (
            select 1 from unnest(t.words) w
            where position(w in (i.title_norm || ' ' || public.normalize_title(i.title))) = 0))
      and (p_before is null or i.published_at < p_before)
      and i.published_at > now() - interval '30 days'
  ),
  leads as (
    select * from matching where rn = 1
    order by published_at desc
    limit least(greatest(p_limit, 1), 100)
  )
  select l.cluster_id,
         c.updated_at,
         l.sport,
         l.id,
         coalesce(l.title_hr, l.title),
         coalesce(l.summary_hr, l.summary),
         l.title_hr is not null,
         l.title,
         l.url,
         l.image_url,
         l.published_at,
         l.source_name,
         l.source_network,
         (select count(*)::int from public.items x where x.cluster_id = l.cluster_id),
         coalesce((
           select jsonb_agg(jsonb_build_object('name', s2.name, 'url', x2.url, 'title', coalesce(x2.title_hr, x2.title)) order by x2.published_at)
           from public.items x2
           join public.sources s2 on s2.id = x2.source_id
           where x2.cluster_id = l.cluster_id and x2.id <> l.id
         ), '[]'::jsonb),
         l.source_reliability::int,
         l.transfer_stage
  from leads l
  join public.clusters c on c.id = l.cluster_id
  order by l.published_at desc
$$;
