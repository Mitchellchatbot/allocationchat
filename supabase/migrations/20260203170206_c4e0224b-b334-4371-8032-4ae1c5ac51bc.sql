-- Add onboarding_complete column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

-- Create a SECURITY DEFINER function to check if user has completed onboarding
-- This bypasses RLS and reliably checks the profile status
CREATE OR REPLACE FUNCTION public.check_onboarding_complete(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT onboarding_complete FROM public.profiles WHERE user_id = user_uuid LIMIT 1),
    false
  );
$$;

-- Create a function to mark onboarding as complete
CREATE OR REPLACE FUNCTION public.mark_onboarding_complete(user_uuid uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  UPDATE public.profiles 
  SET onboarding_complete = true, updated_at = now()
  WHERE user_id = user_uuid;
$$;