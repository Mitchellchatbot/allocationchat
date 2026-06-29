-- Email alert when an applying doctor already exists in the CRM as an older
-- lead (Zoho rejects the export with DUPLICATE_DATA). Defaults true so existing
-- properties start receiving the review alert without any UI change.
ALTER TABLE public.email_notification_settings
  ADD COLUMN IF NOT EXISTS notify_on_crm_duplicate boolean NOT NULL DEFAULT true;
