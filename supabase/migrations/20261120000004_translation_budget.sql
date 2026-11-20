-- Monthly character budget for the translation API (DeepL Free: 500 000 chars/month).
create table if not exists public.translation_usage (
  month date primary key,
  chars integer not null default 0
);
alter table public.translation_usage enable row level security;

-- Atomically reserve p_chars for this month; false when it would exceed p_limit.
create or replace function public.reserve_translation_chars(p_chars integer, p_limit integer default 450000)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := date_trunc('month', now())::date;
  v_ok boolean;
begin
  insert into public.translation_usage (month, chars) values (v_month, 0) on conflict (month) do nothing;
  update public.translation_usage
     set chars = chars + p_chars
   where month = v_month and chars + p_chars <= p_limit
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;
revoke execute on function public.reserve_translation_chars(integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_translation_chars(integer, integer) to service_role;
