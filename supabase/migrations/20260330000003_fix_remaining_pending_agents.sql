-- Some agents still have invitation_status = 'pending' with a stale user_id
-- from the old project. RLS blocks the client-side auto-accept from fixing them
-- (it can't update rows where user_id != auth.uid()). This migration handles
-- all remaining cases by matching on email instead of user_id.

BEGIN;
SET session_replication_role = 'replica';

-- Step 1: Link any remaining pending agents to their correct auth user by email
UPDATE public.agents a
SET
  user_id = au.id,
  invitation_status = 'accepted',
  invitation_token = null,
  invitation_expires_at = null
FROM auth.users au
WHERE lower(a.email) = lower(au.email)
AND a.invitation_status = 'pending';

-- Step 2: Sync agents.id = user_id for any newly linked agents
UPDATE public.property_agents pa
SET agent_id = a.user_id
FROM public.agents a
WHERE pa.agent_id = a.id
  AND a.user_id IS NOT NULL
  AND a.id != a.user_id;

UPDATE public.conversations c
SET assigned_agent_id = a.user_id
FROM public.agents a
WHERE c.assigned_agent_id = a.id
  AND a.user_id IS NOT NULL
  AND a.id != a.user_id;

UPDATE public.ai_agents ai
SET linked_agent_id = a.user_id
FROM public.agents a
WHERE ai.linked_agent_id = a.id
  AND a.user_id IS NOT NULL
  AND a.id != a.user_id;

UPDATE public.agent_complaints ac
SET agent_id = a.user_id
FROM public.agents a
WHERE ac.agent_id = a.id
  AND a.user_id IS NOT NULL
  AND a.id != a.user_id;

UPDATE public.agents
SET id = user_id
WHERE user_id IS NOT NULL
  AND id != user_id;

-- Step 3: Ensure agent roles are set for newly linked agents
DELETE FROM public.user_roles
WHERE role = 'client'
  AND user_id IN (SELECT user_id FROM public.agents WHERE user_id IS NOT NULL)
  AND user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'agent');

UPDATE public.user_roles
SET role = 'agent'
WHERE role = 'client'
  AND user_id IN (SELECT user_id FROM public.agents WHERE user_id IS NOT NULL);

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

SET session_replication_role = 'origin';
COMMIT;
