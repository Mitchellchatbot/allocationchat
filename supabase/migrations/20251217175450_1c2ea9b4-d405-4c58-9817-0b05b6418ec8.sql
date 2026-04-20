-- Add invitation token columns to agents table
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS invitation_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_agents_invitation_token ON public.agents(invitation_token);

-- Create trigger function to link new users to pending agent invitations
CREATE OR REPLACE FUNCTION public.handle_agent_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agent_record RECORD;
BEGIN
  -- Check if there's a pending agent invitation for this email
  SELECT * INTO agent_record
  FROM public.agents
  WHERE email = NEW.email
    AND invitation_status = 'pending'
  LIMIT 1;
  
  IF FOUND THEN
    -- Update the agent record with the new user_id
    UPDATE public.agents
    SET user_id = NEW.id,
        invitation_status = 'accepted',
        invitation_token = NULL,
        invitation_expires_at = NULL,
        updated_at = now()
    WHERE id = agent_record.id;
    
    -- Add the agent role to user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'agent')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Update the existing user role from 'user' to 'agent' if exists
    UPDATE public.user_roles
    SET role = 'agent'
    WHERE user_id = NEW.id AND role = 'user';
  ELSE
    -- For non-invited users, assign client role
    UPDATE public.user_roles
    SET role = 'client'
    WHERE user_id = NEW.id AND role = 'user';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_agent_check ON auth.users;

-- Create trigger to run after user creation
CREATE TRIGGER on_auth_user_created_agent_check
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_agent_signup();