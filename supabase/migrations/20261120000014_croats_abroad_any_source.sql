-- "Hrvati u svijetu": any article that mentions a Croatian athlete playing abroad,
-- whatever the source (Croatian portals cover them most).
create or replace function public.tag_entities(p_item_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text;
begin
  select ' ' || public.normalize_title(coalesce(i.title_hr, i.title) || ' ' || coalesce(i.summary_hr, i.summary, '')) || ' '
    into v_text
  from public.items i
  where i.id = p_item_id;

  if v_text is null then
    return;
  end if;

  insert into public.item_entities (item_id, entity_id)
  select p_item_id, e.id
  from public.entities e
  where exists (select 1 from unnest(e.aliases) a where v_text like '% ' || a || '%')
  on conflict do nothing;

  update public.items i
     set croats_abroad = exists (
       select 1 from public.item_entities ie
       join public.entities e on e.id = ie.entity_id
       where ie.item_id = p_item_id and e.croat_abroad)
   where i.id = p_item_id;
end;
$$;
revoke execute on function public.tag_entities(bigint) from public, anon, authenticated;

-- "Budimir" alone is also the U-17 head coach; require the full name.
update public.entities set aliases = '{"ante budimir"}' where name = 'Ante Budimir';
delete from public.item_entities where entity_id = (select id from public.entities where name = 'Ante Budimir');
