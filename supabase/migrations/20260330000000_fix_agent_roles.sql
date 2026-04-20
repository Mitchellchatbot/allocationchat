-- Fix migrated agents incorrectly assigned role = 'client'.
-- handle_agent_signup falls into its ELSE branch when no pending invitation
-- exists, assigning 'client' to all users created via admin bulk migration.
--
-- Two cases:
-- 1. Agent already has role='agent' AND role='client' → delete the 'client' duplicate
-- 2. Agent only has role='client' → update it to 'agent'

-- Case 1: remove extra 'client' row where 'agent' row already exists
DELETE FROM public.user_roles
WHERE role = 'client'
AND user_id IN (
  SELECT user_id FROM public.agents WHERE user_id IS NOT NULL
)
AND user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'agent'
);

-- Case 2: flip sole 'client' row to 'agent'
UPDATE public.user_roles
SET role = 'agent'
WHERE role = 'client'
AND user_id IN (
  SELECT user_id FROM public.agents WHERE user_id IS NOT NULL
);
