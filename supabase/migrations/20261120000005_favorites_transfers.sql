-- Phase 2: favourites (entities) and Transfer centar.

alter table public.items add column if not exists is_transfer boolean not null default false;
create index if not exists items_transfer_published_idx on public.items (published_at desc) where is_transfer;

-- Clubs and national teams people can follow. Aliases: lowercase, unaccented,
-- matched at the start of a word (so "hajduka", "dinamovci" count).
insert into public.entities (name, kind, sport, aliases, croat_abroad) values
('Hrvatska (nogomet)',  'national_team', 'nogomet', '{vatreni,"hrvatska nogometna","hrvatske nogometne",dalic}', false),
('Hrvatska (košarka)',  'national_team', 'kosarka', '{"hrvatska kosarkaska","hrvatske kosarkaske","kosarkasi hrvatske"}', false),
('Hrvatska (rukomet)',  'national_team', 'rukomet', '{kauboji,kauboja,"hrvatska rukometna","hrvatske rukometne"}', false),
('Hrvatska (vaterpolo)','national_team', 'vaterpolo', '{barakude,barakuda}', false),
('GNK Dinamo',          'club', 'nogomet', '{dinamo,dinamovci,maksimir}', false),
('HNK Hajduk',          'club', 'nogomet', '{hajduk,poljud}', false),
('HNK Rijeka',          'club', 'nogomet', '{"hnk rijeka",rujevica}', false),
('NK Osijek',           'club', 'nogomet', '{"nk osijek","osijeka","opus arena"}', false),
('Real Madrid',         'club', 'nogomet', '{"real madrid","real madrida",madridista}', false),
('FC Barcelona',        'club', 'nogomet', '{barcelona,barcelone,barca}', false),
('Manchester City',     'club', 'nogomet', '{"manchester city","man city"}', false),
('Manchester United',   'club', 'nogomet', '{"manchester united","man utd","man united"}', false),
('Liverpool',           'club', 'nogomet', '{liverpool}', false),
('Arsenal',             'club', 'nogomet', '{arsenal}', false),
('Chelsea',             'club', 'nogomet', '{chelsea}', false),
('Bayern',              'club', 'nogomet', '{bayern}', false),
('Inter',               'club', 'nogomet', '{"inter milan","internazionale",interu,intera}', false),
('AC Milan',            'club', 'nogomet', '{"ac milan",milanu,milana}', false),
('Juventus',            'club', 'nogomet', '{juventus,juve}', false),
('PSG',                 'club', 'nogomet', '{psg,"paris saint"}', false),
('KK Cibona',           'club', 'kosarka', '{cibona,cibone}', false),
('KK Cedevita Olimpija','club', 'kosarka', '{cedevita}', false),
('KK Zadar',            'club', 'kosarka', '{"kk zadar"}', false),
('RK Zagreb',           'club', 'rukomet', '{"ppd zagreb","rk zagreb"}', false),
('Los Angeles Lakers',  'club', 'kosarka', '{lakers}', false),
('LA Clippers',         'club', 'kosarka', '{clippers}', false);

-- Entities the app can offer as favourites.
create or replace view public.followable_entities
with (security_invoker = true) as
  select id, name, kind, sport from public.entities;
grant select on public.followable_entities to anon, authenticated;

-- get_feed gains entity and transfer filters.
drop function if exists public.get_feed(text, text, text[], boolean, text, bigint[], timestamptz, integer);
create or replace function public.get_feed(
  p_kind text,
  p_region text default null,
  p_sports text[] default null,
  p_croats_abroad boolean default false,
  p_network text default null,
  p_hidden_sources bigint[] default '{}',
  p_before timestamptz default null,
  p_limit integer default 30,
  p_entity_ids bigint[] default null,   -- favourites: items mentioning any of these
  p_transfers boolean default false     -- Transfer centar
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
  others       jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with matching as (
    select i.*, s.name as source_name, s.network as source_network,
           row_number() over (partition by i.cluster_id order by s.region = 'hr' desc, i.published_at asc) as rn
    from public.items i
    join public.sources s on s.id = i.source_id
    where (p_kind is null or s.kind = p_kind)
      and s.enabled
      and i.cluster_id is not null
      and not (s.id = any (p_hidden_sources))
      and (p_region is null or s.region = p_region)
      and (p_sports is null or i.sport = any (p_sports))
      and (not p_croats_abroad or i.croats_abroad)
      and (p_network is null or s.network = p_network)
      and (not p_transfers or i.is_transfer)
      and (p_entity_ids is null or exists (
            select 1 from public.item_entities ie where ie.item_id = i.id and ie.entity_id = any (p_entity_ids)))
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
         ), '[]'::jsonb)
  from leads l
  join public.clusters c on c.id = l.cluster_id
  order by l.published_at desc
$$;

-- Tag existing items with the new entities.
create or replace function public.retag_entities()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare r record;
begin
  for r in select id from public.items loop
    perform public.tag_entities(r.id);
  end loop;
end;
$$;
revoke execute on function public.retag_entities() from public, anon, authenticated;
grant execute on function public.retag_entities() to service_role;
