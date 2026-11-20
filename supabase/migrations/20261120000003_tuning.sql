-- Tuning after the first real ingest:
-- 1. clustering threshold 0.45 -> 0.38, only within the same sport (or 'ostalo');
-- 2. entity aliases match at the start of a word, so inflected forms count
--    ("Pašalićev", "Modrića").

create or replace function public.assign_cluster(p_item_id bigint, p_threshold real default 0.38)
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
    and i.source_id <> v_item.source_id
    and (i.sport = v_item.sport or i.sport = 'ostalo' or v_item.sport = 'ostalo')
    and i.published_at > v_item.published_at - interval '36 hours'
    and i.published_at < v_item.published_at + interval '36 hours'
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
    select 1 from unnest(e.aliases) a where v_text like '% ' || a || '%'
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

revoke execute on function public.assign_cluster(bigint, real) from public, anon, authenticated;
revoke execute on function public.tag_entities(bigint) from public, anon, authenticated;

-- Re-run sport-independent steps over existing items (sport is re-classified by the ingest code).
create or replace function public.recluster_all()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare r record;
begin
  update public.items set cluster_id = null;
  delete from public.clusters;
  delete from public.item_entities;
  update public.items set croats_abroad = false;
  for r in select id from public.items order by published_at loop
    perform public.finalize_item(r.id);
  end loop;
end;
$$;
revoke execute on function public.recluster_all() from public, anon, authenticated;
grant execute on function public.recluster_all() to service_role;
