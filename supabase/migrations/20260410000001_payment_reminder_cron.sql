-- Schedule daily payment reminder emails at 10am UTC
SELECT cron.schedule(
  'send-payment-reminders',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://qnafaecxrokafizyozpx.supabase.co/functions/v1/send-payment-reminders',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_EN4ugxUcJl4BgCqiFpLGPw_2sVInkx_"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
