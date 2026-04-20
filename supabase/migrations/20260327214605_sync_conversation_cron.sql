-- Enable pg_cron and pg_net extensions (required for scheduled HTTP calls)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule sync-conversation-data to run every hour
SELECT cron.schedule(
  'sync-conversation-data',
  '0 * * * *',  -- every hour on the hour
  $$
  SELECT net.http_post(
    url    := 'https://qnafaecxrokafizyozpx.supabase.co/functions/v1/sync-conversation-data',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
