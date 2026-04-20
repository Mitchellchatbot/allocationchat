-- Migrated agents have user_id = null in the agents table because they were
-- added as pending invitations but never went through the invitation acceptance
-- flow. This links them by matching email with auth.users.
-- All steps filter against auth.users to avoid FK violations from stale IDs.

-- Step 1: Link user_id for agents where email matches an auth user (null only)
UPDATE public.agents a
SET
  user_id = au.id,
  invitation_status = 'accepted',
  invitation_token = null,
  invitation_expires_at = null
FROM auth.users au
WHERE lower(a.email) = lower(au.email)
AND a.user_id IS NULL;

-- Step 2: Mark accepted for agents that were already linked by email
-- (user_id was set but invitation_status is still pending)
UPDATE public.agents a
SET
  invitation_status = 'accepted',
  invitation_token = null,
  invitation_expires_at = null
WHERE a.invitation_status = 'pending'
AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = a.user_id);

-- Step 3: Remove duplicate 'client' role for agents who already have 'agent'
DELETE FROM public.user_roles
WHERE role = 'client'
AND user_id IN (
  SELECT user_id FROM public.agents
  WHERE user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = user_id)
)
AND user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'agent');

-- Step 4: Flip sole 'client' row to 'agent' for remaining valid agents
UPDATE public.user_roles
SET role = 'agent'
WHERE role = 'client'
AND user_id IN (
  SELECT user_id FROM public.agents
  WHERE user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = user_id)
);

-- Step 5: Insert 'agent' role for any linked agent who has no role row at all
INSERT INTO public.user_roles (user_id, role)
SELECT a.user_id, 'agent'
FROM public.agents a
WHERE a.user_id IS NOT NULL
AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = a.user_id)
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = a.user_id AND ur.role = 'agent'
)
ON CONFLICT (user_id, role) DO NOTHING;
