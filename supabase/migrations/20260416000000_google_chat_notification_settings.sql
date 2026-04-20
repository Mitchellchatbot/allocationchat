CREATE TABLE public.google_chat_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  space_id TEXT,
  space_name TEXT,
  pending_access_token TEXT,
  pending_refresh_token TEXT,
  pending_token_expires_at TIMESTAMPTZ,
  notify_on_new_conversation BOOLEAN DEFAULT true,
  notify_on_phone_submission BOOLEAN DEFAULT true,
  notify_on_insurance_submission BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.google_chat_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own google chat settings"
  ON public.google_chat_notification_settings
  USING (property_id IN (SELECT id FROM properties WHERE user_id = auth.uid()));

GRANT ALL ON public.google_chat_notification_settings TO service_role;
