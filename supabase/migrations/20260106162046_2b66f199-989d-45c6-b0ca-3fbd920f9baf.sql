-- Update slack_notification_settings table for OAuth
ALTER TABLE public.slack_notification_settings 
ADD COLUMN client_id TEXT,
ADD COLUMN client_secret TEXT,
ADD COLUMN access_token TEXT,
ADD COLUMN team_id TEXT,
ADD COLUMN team_name TEXT,
ADD COLUMN bot_user_id TEXT,
ADD COLUMN incoming_webhook_channel TEXT,
ADD COLUMN incoming_webhook_url TEXT;

-- Rename webhook_url to legacy_webhook_url (for migration purposes)
ALTER TABLE public.slack_notification_settings 
RENAME COLUMN webhook_url TO legacy_webhook_url;