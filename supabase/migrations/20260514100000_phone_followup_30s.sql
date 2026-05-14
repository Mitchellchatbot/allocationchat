-- Tighten the phone-decline fallback timing: the doctor now gets the
-- Calendly link if they've been silent for >=30s instead of 60s, so the
-- cron also needs to run every 30s to actually deliver in time.
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-phone-followup') THEN
    PERFORM cron.unschedule('send-phone-followup');
  END IF;
  PERFORM cron.schedule(
    'send-phone-followup',
    '30 seconds',
    $job$
    SELECT net.http_post(
      url     := 'https://oiigbvfzovhnuitprsjt.supabase.co/functions/v1/send-phone-followup',
      headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paWdidmZ6b3ZobnVpdHByc2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTcxMzksImV4cCI6MjA5MjI5MzEzOX0.JK8OSoHQ440ahkDSRxtHux9mgDhRRNliduhi24JTPks"}'::jsonb,
      body    := '{}'::jsonb
    );
    $job$
  );
END
$outer$;
