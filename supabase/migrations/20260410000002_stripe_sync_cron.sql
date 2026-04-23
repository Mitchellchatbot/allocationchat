-- Sync Stripe subscription statuses to local DB every hour
SELECT cron.schedule(
  'sync-stripe-subscriptions',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://oiigbvfzovhnuitprsjt.supabase.co/functions/v1/sync-stripe-subscriptions',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_EN4ugxUcJl4BgCqiFpLGPw_2sVInkx_"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
