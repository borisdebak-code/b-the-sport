-- B The Sport: initial schema (phase 1: portals + YouTube, sport classification,
-- story clustering, "Hrvati u svijetu").

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Lowercased, unaccented text used for story clustering.
create or replace function public.normalize_title(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(regexp_replace(lower(extensions.unaccent('extensions.unaccent', coalesce(t, ''))), '[^a-z0-9 ]+', ' ', 'g'))
$$;

-- ---------------------------------------------------------------------------
-- Sources: portals and social accounts
-- ---------------------------------------------------------------------------
create table public.sources (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  name          text not null,
  kind          text not null check (kind in ('portal', 'social')),
  network       text not null check (network in ('rss', 'html', 'youtube', 'instagram', 'bluesky', 'facebook', 'x')),
  region        text not null check (region in ('hr', 'regija', 'svijet')),
  country       text not null,               -- ISO-ish code: HR, RS, BA, SI, ME, UK, US, ES, IT, FR, DE, PT, INT
  lang          text not null,               -- hr, sr, bs, cnr, sl, en, es, it, fr, de, pt
  homepage      text,
  feed_url      text,                        -- RSS/Atom URL (null until verified/known)
  handle        text,                        -- social handle, e.g. FabrizioRomano
  default_sport text,                        -- set when a feed is sport-specific
  reliability   smallint not null default 3 check (reliability between 1 and 3),
  enabled       boolean not null default true,
  verified      boolean not null default false, -- feed checked and parsed successfully
  last_fetched_at timestamptz,
  last_error    text,
  created_at    timestamptz not null default now()
);

-- One portal may have several sport-specific feeds.
create table public.source_feeds (
  id          bigint generated always as identity primary key,
  source_id   bigint not null references public.sources (id) on delete cascade,
  feed_url    text not null unique,
  sport       text,                          -- null = mixed sport feed, classify per item
  verified    boolean not null default false,
  last_fetched_at timestamptz,
  last_error  text
);
create index source_feeds_source_id_idx on public.source_feeds (source_id);

-- ---------------------------------------------------------------------------
-- Clusters (one card per story) and items (articles / posts)
-- ---------------------------------------------------------------------------
create table public.clusters (
  id           bigint generated always as identity primary key,
  lead_item_id bigint,
  sport        text not null default 'ostalo',
  item_count   integer not null default 1,
  first_seen_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.items (
  id            bigint generated always as identity primary key,
  source_id     bigint not null references public.sources (id) on delete cascade,
  url           text not null unique,
  title         text not null,
  summary       text,
  image_url     text,
  published_at  timestamptz not null,
  fetched_at    timestamptz not null default now(),
  lang          text not null,
  title_hr      text,                        -- translation (null if source is hr/sr/bs/cnr)
  summary_hr    text,
  sport         text not null default 'ostalo',
  cluster_id    bigint references public.clusters (id) on delete set null,
  croats_abroad boolean not null default false,
  title_norm    text generated always as (public.normalize_title(coalesce(title_hr, title))) stored
);
create index items_published_at_idx on public.items (published_at desc);
create index items_cluster_id_idx on public.items (cluster_id);
create index items_source_id_idx on public.items (source_id);
create index items_sport_published_idx on public.items (sport, published_at desc);
create index items_title_norm_trgm_idx on public.items using gin (title_norm extensions.gin_trgm_ops);

alter table public.clusters
  add constraint clusters_lead_item_fk foreign key (lead_item_id) references public.items (id) on delete set null;
create index clusters_lead_item_id_idx on public.clusters (lead_item_id);
create index clusters_updated_at_idx on public.clusters (updated_at desc);

-- ---------------------------------------------------------------------------
-- Entities: clubs, national teams, athletes ("Hrvati u svijetu", favourites later)
-- ---------------------------------------------------------------------------
create table public.entities (
  id            bigint generated always as identity primary key,
  name          text not null,
  kind          text not null check (kind in ('athlete', 'club', 'national_team')),
  sport         text not null,
  aliases       text[] not null default '{}', -- lowercased, unaccented match strings
  croat_abroad  boolean not null default false
);

create table public.item_entities (
  item_id   bigint not null references public.items (id) on delete cascade,
  entity_id bigint not null references public.entities (id) on delete cascade,
  primary key (item_id, entity_id)
);
create index item_entities_entity_id_idx on public.item_entities (entity_id);

-- ---------------------------------------------------------------------------
-- Seasonal sport tabs (zimski sportovi, vaterpolo during major tournaments)
-- ---------------------------------------------------------------------------
create table public.sport_windows (
  id        bigint generated always as identity primary key,
  sport     text not null,
  label     text not null,
  starts_on date not null,
  ends_on   date not null,
  check (ends_on >= starts_on)
);
create index sport_windows_dates_idx on public.sport_windows (starts_on, ends_on);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------


-- Attach an item to an existing story (similar title in the last 48 h) or open a new one.
create or replace function public.assign_cluster(p_item_id bigint, p_threshold real default 0.45)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.items;
  v_cluster bigint;
begin
  select * into v_item from public.items where id = p_item_id;
  if v_item.id is null then
    return null;
  end if;
  if v_item.cluster_id is not null then
    return v_item.cluster_id;
  end if;

  select i.cluster_id into v_cluster
  from public.items i
  where i.id <> v_item.id
    and i.cluster_id is not null
    and i.published_at > v_item.published_at - interval '48 hours'
    and i.published_at < v_item.published_at + interval '48 hours'
    and extensions.similarity(i.title_norm, v_item.title_norm) >= p_threshold
  order by extensions.similarity(i.title_norm, v_item.title_norm) desc
  limit 1;

  if v_cluster is null then
    insert into public.clusters (lead_item_id, sport, first_seen_at, updated_at)
    values (v_item.id, v_item.sport, v_item.published_at, v_item.published_at)
    returning id into v_cluster;
  else
    update public.clusters
       set item_count = item_count + 1,
           updated_at = greatest(updated_at, v_item.published_at)
     where id = v_cluster;
  end if;

  update public.items set cluster_id = v_cluster where id = v_item.id;
  return v_cluster;
end;
$$;

-- Tag entity mentions and set the "Hrvati u svijetu" flag
-- (a Croatian athlete/club mentioned by a regional or world source).
create or replace function public.tag_entities(p_item_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text;
  v_region text;
begin
  select ' ' || public.normalize_title(coalesce(i.title_hr, i.title) || ' ' || coalesce(i.summary_hr, i.summary, '')) || ' ',
         s.region
    into v_text, v_region
  from public.items i
  join public.sources s on s.id = i.source_id
  where i.id = p_item_id;

  if v_text is null then
    return;
  end if;

  insert into public.item_entities (item_id, entity_id)
  select p_item_id, e.id
  from public.entities e
  where exists (
    select 1 from unnest(e.aliases) a where v_text like '% ' || a || ' %'
  )
  on conflict do nothing;

  if v_region <> 'hr' then
    update public.items i
       set croats_abroad = true
     where i.id = p_item_id
       and exists (
         select 1 from public.item_entities ie
         join public.entities e on e.id = ie.entity_id
         where ie.item_id = p_item_id and e.croat_abroad
       );
  end if;
end;
$$;

-- Sports whose tab is visible today (seasonal tabs only).
create or replace function public.active_seasonal_sports(p_day date default current_date)
returns setof text
language sql
stable
set search_path = ''
as $$
  select distinct sport from public.sport_windows
  where p_day between starts_on and ends_on
  union
  select 'zimski' where extract(month from p_day) in (11, 12, 1, 2, 3)
$$;

-- Feed for the app: one row per story, newest first, keyset pagination on updated_at.
create or replace function public.get_feed(
  p_kind text,                      -- 'portal' | 'social'
  p_region text default null,       -- 'hr' | 'regija' | 'svijet' | null
  p_sports text[] default null,     -- sport ids, null for "Sve"
  p_croats_abroad boolean default false,
  p_network text default null,      -- social only: 'youtube', 'instagram', ...
  p_hidden_sources bigint[] default '{}',
  p_before timestamptz default null,
  p_limit integer default 30
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
    where s.kind = p_kind
      and s.enabled
      and i.cluster_id is not null
      and not (s.id = any (p_hidden_sources))
      and (p_region is null or s.region = p_region)
      and (p_sports is null or i.sport = any (p_sports))
      and (not p_croats_abroad or i.croats_abroad)
      and (p_network is null or s.network = p_network)
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

-- ---------------------------------------------------------------------------
-- Row level security: the app (anon key) can read; only the service role writes.
-- ---------------------------------------------------------------------------
alter table public.sources        enable row level security;
alter table public.source_feeds   enable row level security;
alter table public.clusters       enable row level security;
alter table public.items          enable row level security;
alter table public.entities       enable row level security;
alter table public.item_entities  enable row level security;
alter table public.sport_windows  enable row level security;

create policy "read sources"       on public.sources       for select to anon, authenticated using (true);
create policy "read clusters"      on public.clusters      for select to anon, authenticated using (true);
create policy "read items"         on public.items         for select to anon, authenticated using (true);
create policy "read entities"      on public.entities      for select to anon, authenticated using (true);
create policy "read item_entities" on public.item_entities for select to anon, authenticated using (true);
create policy "read sport_windows" on public.sport_windows for select to anon, authenticated using (true);
-- source_feeds stays private (no policy): only the ingest function reads it.

-- Called by the ingest function after each insert.
create or replace function public.finalize_item(p_item_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.tag_entities(p_item_id);
  return public.assign_cluster(p_item_id);
end;
$$;

revoke execute on function public.assign_cluster(bigint, real) from public, anon, authenticated;
revoke execute on function public.tag_entities(bigint) from public, anon, authenticated;
revoke execute on function public.finalize_item(bigint) from public, anon, authenticated;
grant execute on function public.finalize_item(bigint) to service_role;

-- Retention: keep 30 days of items (saved items arrive in phase 2).
create or replace function public.prune_old_items()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.items where published_at < now() - interval '30 days';
  delete from public.clusters c where not exists (select 1 from public.items i where i.cluster_id = c.id);
$$;
revoke execute on function public.prune_old_items() from public, anon, authenticated;
grant execute on function public.prune_old_items() to service_role;
