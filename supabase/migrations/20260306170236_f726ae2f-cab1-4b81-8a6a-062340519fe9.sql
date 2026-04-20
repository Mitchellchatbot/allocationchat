
-- Security definer function to look up a user_id by email without exposing the full profile
CREATE OR REPLACE FUNCTION public.lookup_user_id_by_email(lookup_email text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT user_id FROM public.profiles WHERE email = lower(lookup_email) LIMIT 1;
$$;
