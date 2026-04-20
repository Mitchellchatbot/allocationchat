-- Remove the client_id and client_secret columns from slack_notification_settings
-- These are now stored as backend secrets (Zapier-style single app model)
ALTER TABLE public.slack_notification_settings DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.slack_notification_settings DROP COLUMN IF EXISTS client_secret;