
ALTER TABLE public.slack_notification_settings ADD COLUMN notify_on_phone_submission boolean NOT NULL DEFAULT true;
ALTER TABLE public.email_notification_settings ADD COLUMN notify_on_phone_submission boolean NOT NULL DEFAULT true;
