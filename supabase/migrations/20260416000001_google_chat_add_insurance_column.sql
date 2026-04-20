-- Add insurance column (may not exist if original migration ran before the rename)
ALTER TABLE public.google_chat_notification_settings
  ADD COLUMN IF NOT EXISTS notify_on_insurance_submission BOOLEAN DEFAULT true;

-- Drop escalation column if it exists from the original migration
ALTER TABLE public.google_chat_notification_settings
  DROP COLUMN IF EXISTS notify_on_escalation;

-- Clean up any incomplete rows left from failed OAuth attempts (no access_token)
DELETE FROM public.google_chat_notification_settings
  WHERE access_token IS NULL AND space_id IS NULL;
