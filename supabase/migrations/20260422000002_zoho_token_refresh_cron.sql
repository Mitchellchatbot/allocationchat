-- Cron: proactively refresh all Zoho access tokens every 30 minutes.
-- Zoho tokens expire after 1 hour. Running every 30 minutes with a 35-minute
-- lookahead window means every token is always refreshed before it can expire.
SELECT cron.schedule(
  'refresh-zoho-tokens',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://oiigbvfzovhnuitprsjt.supabase.co/functions/v1/refresh-zoho-tokens',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paWdidmZ6b3ZobnVpdHByc2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTcxMzksImV4cCI6MjA5MjI5MzEzOX0.JK8OSoHQ440ahkDSRxtHux9mgDhRRNliduhi24JTPks"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
