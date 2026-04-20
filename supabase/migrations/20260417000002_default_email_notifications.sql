-- Auto-create email notification settings for every new property,
-- using the owner's signup email with new_conversation and phone_submission on by default.

CREATE OR REPLACE FUNCTION public.create_default_email_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  owner_email TEXT;
BEGIN
  SELECT email INTO owner_email
  FROM public.profiles
  WHERE id = NEW.user_id
  LIMIT 1;

  IF owner_email IS NOT NULL THEN
    INSERT INTO public.email_notification_settings (
      property_id,
      enabled,
      notification_emails,
      notify_on_new_conversation,
      notify_on_escalation,
      notify_on_phone_submission
    ) VALUES (
      NEW.id,
      true,
      ARRAY[owner_email],
      true,
      false,
      true
    )
    ON CONFLICT (property_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_default_email_notifications
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_email_notifications();

-- Back-fill any existing properties that don't have a settings row yet
INSERT INTO public.email_notification_settings (
  property_id,
  enabled,
  notification_emails,
  notify_on_new_conversation,
  notify_on_escalation,
  notify_on_phone_submission
)
SELECT
  p.id,
  true,
  ARRAY[pr.email],
  true,
  false,
  true
FROM public.properties p
JOIN public.profiles pr ON pr.id = p.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_notification_settings ens WHERE ens.property_id = p.id
)
  AND pr.email IS NOT NULL;
