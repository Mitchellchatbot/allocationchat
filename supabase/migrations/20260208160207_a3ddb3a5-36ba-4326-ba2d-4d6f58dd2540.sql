
-- Add CSRF token columns for Salesforce OAuth protection
ALTER TABLE public.salesforce_settings 
ADD COLUMN IF NOT EXISTS pending_oauth_token text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pending_oauth_expires_at timestamp with time zone DEFAULT NULL;

-- Hide invitation_token from non-owner queries by creating a view-restricting policy
-- The existing RLS already restricts access, but we should ensure invitation_token 
-- is not exposed even to invited-by users unnecessarily
-- We'll revoke direct column access isn't possible with RLS, so instead we ensure
-- the token column is nulled out after acceptance via a trigger

CREATE OR REPLACE FUNCTION public.clear_accepted_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invitation_status = 'accepted' THEN
    NEW.invitation_token := NULL;
    NEW.invitation_expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER clear_invitation_token_on_accept
BEFORE UPDATE ON public.agents
FOR EACH ROW
WHEN (NEW.invitation_status = 'accepted' AND OLD.invitation_status != 'accepted')
EXECUTE FUNCTION public.clear_accepted_invitation_token();
