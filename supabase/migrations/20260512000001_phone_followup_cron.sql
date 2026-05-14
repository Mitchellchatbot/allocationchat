-- Cron: every minute, send the Calendly booking fallback to any conversation
-- where the doctor hasn't replied to the phone-number question within ~1 min.
SELECT cron.schedule(
  'send-phone-followup',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://oiigbvfzovhnuitprsjt.supabase.co/functions/v1/send-phone-followup',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paWdidmZ6b3ZobnVpdHByc2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTcxMzksImV4cCI6MjA5MjI5MzEzOX0.JK8OSoHQ440ahkDSRxtHux9mgDhRRNliduhi24JTPks"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
