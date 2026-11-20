-- Schedule the ingest function every 5 minutes.
-- Run once in the Supabase SQL editor after deploying the function, replacing
-- <PROJECT_REF> and <INGEST_SECRET> (the same value as the function's INGEST_SECRET secret).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'ingest-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/ingest',
    headers := jsonb_build_object('Authorization', 'Bearer <INGEST_SECRET>', 'Content-Type', 'application/json'),
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
