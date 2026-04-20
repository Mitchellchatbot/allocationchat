
CREATE OR REPLACE FUNCTION public.log_agent_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  prop_id uuid;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('online', 'offline') THEN
    -- Find a property associated with this agent
    SELECT pa.property_id INTO prop_id 
    FROM public.property_agents pa 
    WHERE pa.agent_id = NEW.id 
    LIMIT 1;

    -- Fallback: find a property owned by the inviter
    IF prop_id IS NULL AND NEW.invited_by IS NOT NULL THEN
      SELECT id INTO prop_id FROM public.properties WHERE user_id = NEW.invited_by LIMIT 1;
    END IF;

    IF prop_id IS NOT NULL THEN
      INSERT INTO public.notification_logs (
        property_id, notification_type, channel, recipient, recipient_type, status, visitor_name
      ) VALUES (
        prop_id,
        CASE WHEN NEW.status = 'online' THEN 'agent_online' ELSE 'agent_offline' END,
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

CREATE TRIGGER trg_agent_status_change
  AFTER UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.log_agent_status_change();
