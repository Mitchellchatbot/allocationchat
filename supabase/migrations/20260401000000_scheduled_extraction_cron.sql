-- Enable pg_cron and pg_net extensions (required for scheduled HTTP calls)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule run-scheduled-extraction to run every 2 minutes
SELECT cron.schedule(
  'run-scheduled-extraction',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://qnafaecxrokafizyozpx.supabase.co/functions/v1/run-scheduled-extraction',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
