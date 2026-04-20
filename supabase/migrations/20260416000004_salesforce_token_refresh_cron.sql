-- Cron: proactively refresh all Salesforce tokens every 30 minutes.
-- Tokens are set to expire in 2h after refresh; running at 30-min intervals
-- means every token is refreshed well before it could ever expire.
SELECT cron.schedule(
  'refresh-salesforce-tokens',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://qnafaecxrokafizyozpx.supabase.co/functions/v1/refresh-salesforce-tokens',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_EN4ugxUcJl4BgCqiFpLGPw_2sVInkx_"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
