-- Per-user data for signed-in users (favourites, saved articles, hidden sources).
-- Each user can only read and change their own rows.

create table if not exists public.user_favorites (
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  entity_id  bigint not null references public.entities (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, entity_id)
);

create table if not exists public.user_saved (
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  cluster_id bigint not null,
  entry      jsonb not null,            -- the card as shown, so it survives the 30-day pruning
  saved_at   timestamptz not null default now(),
  primary key (user_id, cluster_id)
);

create table if not exists public.user_hidden_sources (
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  source_id  bigint not null references public.sources (id) on delete cascade,
  primary key (user_id, source_id)
);

create index if not exists user_favorites_entity_idx on public.user_favorites (entity_id);
create index if not exists user_hidden_sources_source_idx on public.user_hidden_sources (source_id);

alter table public.user_favorites      enable row level security;
alter table public.user_saved          enable row level security;
alter table public.user_hidden_sources enable row level security;

create policy "own favorites" on public.user_favorites for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own saved" on public.user_saved for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own hidden sources" on public.user_hidden_sources for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_favorites, public.user_saved, public.user_hidden_sources to authenticated;
revoke all on public.user_favorites, public.user_saved, public.user_hidden_sources from anon;
