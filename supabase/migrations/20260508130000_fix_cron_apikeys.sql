-- The four pg_cron jobs below were all configured with a publishable key that
-- doesn't belong to this Supabase project, so each scheduled call was rejected
-- by the gateway with 401 before the edge function ever ran. The most painful
-- symptom: visitor info extraction never fired, so chats produced no leads.
-- Re-schedule them all with the correct anon JWT for project oiigbvfzovhnuitprsjt.

DO $$
DECLARE
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paWdidmZ6b3ZobnVpdHByc2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTcxMzksImV4cCI6MjA5MjI5MzEzOX0.JK8OSoHQ440ahkDSRxtHux9mgDhRRNliduhi24JTPks';
BEGIN
  -- Unschedule each job if it currently exists, then reschedule with the right key.
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-extraction') THEN
    PERFORM cron.unschedule('run-scheduled-extraction');
  END IF;
  PERFORM cron.schedule(
    'run-scheduled-extraction',
    '*/2 * * * *',
    format($f$
      SELECT net.http_post(
        url := 'https://oiigbvfzovhnuitprsjt.supabase.co/functions/v1/run-scheduled-extraction',
        headers := jsonb_build_object('Content-Type','application/json','apikey',%L),
        body := '{}'::jsonb
      );
    $f$, anon_key)
  );

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-payment-reminders') THEN
    PERFORM cron.unschedule('send-payment-reminders');
  END IF;
  PERFORM cron.schedule(
    'send-payment-reminders',
    '0 9 * * *',
    format($f$
      SELECT net.http_post(
        url := 'https://oiigbvfzovhnuitprsjt.supabase.co/functions/v1/send-payment-reminders',
        headers := jsonb_build_object('Content-Type','application/json','apikey',%L),
        body := '{}'::jsonb
      );
    $f$, anon_key)
  );

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-stripe-subscriptions') THEN
    PERFORM cron.unschedule('sync-stripe-subscriptions');
  END IF;
  PERFORM cron.schedule(
    'sync-stripe-subscriptions',
    '0 * * * *',
    format($f$
      SELECT net.http_post(
        url := 'https://oiigbvfzovhnuitprsjt.supabase.co/functions/v1/sync-stripe-subscriptions',
        headers := jsonb_build_object('Content-Type','application/json','apikey',%L),
        body := '{}'::jsonb
      );
    $f$, anon_key)
  );

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-salesforce-tokens') THEN
    PERFORM cron.unschedule('refresh-salesforce-tokens');
  END IF;
  PERFORM cron.schedule(
    'refresh-salesforce-tokens',
    '*/30 * * * *',
    format($f$
      SELECT net.http_post(
        url := 'https://oiigbvfzovhnuitprsjt.supabase.co/functions/v1/refresh-salesforce-tokens',
        headers := jsonb_build_object('Content-Type','application/json','apikey',%L),
        body := '{}'::jsonb
      );
    $f$, anon_key)
  );
END $$;
