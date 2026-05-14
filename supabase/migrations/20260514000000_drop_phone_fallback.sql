-- Cleanup: a prior session applied two `phone_fallback` migrations directly to
-- the remote DB (cron job + booking_fallback_sent column) but the source files
-- were never committed and the edge function was never deployed. We consolidated
-- on the `phone_followup` approach (explicit phone_asked_at signal) instead, so
-- the orphaned cron is just retrying a non-existent endpoint every minute.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-phone-fallback') THEN
    PERFORM cron.unschedule('send-phone-fallback');
  END IF;
END $$;

ALTER TABLE conversations DROP COLUMN IF EXISTS booking_fallback_sent;
