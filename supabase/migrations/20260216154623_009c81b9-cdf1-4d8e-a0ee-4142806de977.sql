-- Trigger to log notification when agent invitation is accepted
CREATE OR REPLACE FUNCTION public.log_agent_invitation_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prop_id uuid;
BEGIN
  -- Only fire when invitation_status changes to 'accepted'
  IF OLD.invitation_status IS DISTINCT FROM 'accepted' AND NEW.invitation_status = 'accepted' AND NEW.invited_by IS NOT NULL THEN
    -- Find a property owned by the inviter to use as context
    SELECT id INTO prop_id FROM public.properties WHERE user_id = NEW.invited_by LIMIT 1;
    
    IF prop_id IS NOT NULL THEN
      INSERT INTO public.notification_logs (
        property_id, notification_type, channel, recipient, recipient_type, status, visitor_name
      ) VALUES (
        prop_id,
        'invitation_accepted',
        'in_app',
        'system',
        'system',
        'sent',
        NEW.name
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_agent_invitation_accepted
  AFTER UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.log_agent_invitation_accepted();