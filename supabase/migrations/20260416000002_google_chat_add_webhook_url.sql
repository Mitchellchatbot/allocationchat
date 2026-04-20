-- Add webhook_url column for incoming webhook approach (replaces OAuth)
ALTER TABLE public.google_chat_notification_settings
  ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Clear any incomplete OAuth-only rows so they don't block fresh webhook setups
-- (rows with no webhook_url AND no working access_token are dead state)
UPDATE public.google_chat_notification_settings
  SET enabled = false
  WHERE webhook_url IS NULL
    AND (access_token IS NULL OR space_id IS NULL);
