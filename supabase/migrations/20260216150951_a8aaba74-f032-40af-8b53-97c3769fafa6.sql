
CREATE OR REPLACE FUNCTION public.handle_agent_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  agent_record RECORD;
BEGIN
  SELECT * INTO agent_record
  FROM public.agents
  WHERE email = NEW.email
    AND invitation_status = 'pending'
  LIMIT 1;
  
  IF FOUND THEN
    UPDATE public.agents
    SET user_id = NEW.id,
        invitation_status = 'accepted',
        invitation_token = NULL,
        invitation_expires_at = NULL,
        updated_at = now()
    WHERE id = agent_record.id;
    
    -- Delete the default 'user' role first, then insert 'agent'
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = 'user';
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'agent')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- For non-invited users, delete 'user' role and insert 'client'
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = 'user';
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;
