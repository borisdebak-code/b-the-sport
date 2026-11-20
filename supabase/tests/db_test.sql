-- Database behaviour tests. Run against a database with the migration + seed applied:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/db_test.sql
-- Everything runs in a transaction that is rolled back.
begin;

do $$
declare
  a bigint; b bigint; c bigint; d bigint; ca bigint; cb bigint; cc bigint; cd bigint;
  n int;
begin
  -- Same story from a Croatian and a regional portal, different wording.
  insert into public.items (source_id, url, title, published_at, lang, sport)
  values ((select id from public.sources where slug = 'index-sport'), 'https://t/1',
          'Dinamo pobijedio Hajduk 2:1 u derbiju na Maksimiru', now() - interval '2 hours', 'hr', 'nogomet')
  returning id into a;
  insert into public.items (source_id, url, title, published_at, lang, sport)
  values ((select id from public.sources where slug = 'sportski-zurnal'), 'https://t/2',
          'Dinamo pobijedio Hajduk 2:1 u derbiju Maksimir', now() - interval '1 hours', 'sr', 'nogomet')
  returning id into b;
  -- Unrelated story.
  insert into public.items (source_id, url, title, published_at, lang, sport)
  values ((select id from public.sources where slug = 'index-sport'), 'https://t/3',
          'Kauboji svladali Island na Europskom prvenstvu', now() - interval '1 hours', 'hr', 'rukomet')
  returning id into c;
  -- World source mentioning a Croatian abroad (translated title used for matching).
  insert into public.items (source_id, url, title, title_hr, published_at, lang, sport)
  values ((select id from public.sources where slug = 'marca'), 'https://t/4',
          'Modrić brilla en la victoria del Milan', 'Modrić blista u pobjedi Milana', now() - interval '30 minutes', 'es', 'nogomet')
  returning id into d;

  select public.finalize_item(a) into ca;
  select public.finalize_item(b) into cb;
  select public.finalize_item(c) into cc;
  select public.finalize_item(d) into cd;

  if ca is distinct from cb then raise exception 'FAIL: same story not clustered (% vs %)', ca, cb; end if;
  if cc = ca then raise exception 'FAIL: unrelated story clustered with derby'; end if;
  if (select item_count from public.clusters where id = ca) <> 2 then raise exception 'FAIL: cluster count'; end if;

  if not (select croats_abroad from public.items where id = d) then raise exception 'FAIL: Modrić in Marca not flagged'; end if;
  if (select croats_abroad from public.items where id = a) then raise exception 'FAIL: HR portal flagged as abroad'; end if;

  -- Feed: portal/hr shows derby once (Croatian lead) + handball.
  select count(*) into n from public.get_feed('portal', 'hr');
  if n <> 2 then raise exception 'FAIL: hr feed has % rows, expected 2', n; end if;
  if (select source_count from public.get_feed('portal', 'hr') where cluster_id = ca) <> 2 then
    raise exception 'FAIL: derby source_count';
  end if;
  if (select item_id from public.get_feed('portal') where cluster_id = ca) <> a then
    raise exception 'FAIL: lead should be the Croatian source';
  end if;
  select count(*) into n from public.get_feed('portal', null, array['rukomet']);
  if n <> 1 then raise exception 'FAIL: sport filter (% rows)', n; end if;
  select count(*) into n from public.get_feed('portal', null, null, true);
  if n <> 1 then raise exception 'FAIL: Hrvati u svijetu filter (% rows)', n; end if;
  if not (select translated from public.get_feed('portal', 'svijet')) then raise exception 'FAIL: translated flag'; end if;
  select count(*) into n from public.get_feed('portal', null, null, false, null, array[(select id from public.sources where slug = 'index-sport')]);
  if n <> 2 then raise exception 'FAIL: hidden sources (% rows)', n; end if;

  -- Seasonal tabs.
  if not exists (select 1 from public.active_seasonal_sports('2026-12-01') s where s = 'zimski') then raise exception 'FAIL: winter in Dec'; end if;
  if exists (select 1 from public.active_seasonal_sports('2026-07-01') s where s = 'zimski') then raise exception 'FAIL: winter in Jul'; end if;
  insert into public.sport_windows (sport, label, starts_on, ends_on) values ('vaterpolo', 'Test', '2027-01-01', '2027-01-20');
  if not exists (select 1 from public.active_seasonal_sports('2027-01-10') s where s = 'vaterpolo') then raise exception 'FAIL: vaterpolo window'; end if;

  raise notice 'ALL DB TESTS PASSED';
end;
$$;

-- The app role can read the feed but not write.
set local role anon;
select count(*) as anon_can_read from public.get_feed('portal');
do $$
begin
  begin
    insert into public.sources (slug, name, kind, network, region, country, lang) values ('x', 'x', 'portal', 'rss', 'hr', 'HR', 'hr');
    raise exception 'FAIL: anon could insert';
  exception when insufficient_privilege then
    raise notice 'anon insert blocked: ok';
  end;
end;
$$;
reset role;

rollback;
