
-- Trigger to log new conversations into notification_logs
CREATE OR REPLACE FUNCTION public.log_new_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notification_logs (
    property_id, conversation_id, notification_type, channel, recipient, recipient_type, status, visitor_name
  ) VALUES (
    NEW.property_id,
    NEW.id,
    'new_conversation',
    'in_app',
    'system',
    'system',
    'sent',
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_new_conversation
AFTER INSERT ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.log_new_conversation();

-- Trigger to log new properties into notification_logs
CREATE OR REPLACE FUNCTION public.log_new_property()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notification_logs (
    property_id, notification_type, channel, recipient, recipient_type, status
  ) VALUES (
    NEW.id,
    'property_added',
    'in_app',
    'system',
    'system',
    'sent'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_new_property
AFTER INSERT ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.log_new_property();

-- Allow service role / triggers to insert notification logs without auth
-- (the existing anon INSERT policy requires auth.uid() IS NOT NULL, 
--  but triggers run as SECURITY DEFINER so this is fine)
