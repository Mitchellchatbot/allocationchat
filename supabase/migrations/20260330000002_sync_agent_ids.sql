-- agents.id (PK) kept the old project UUID while agents.user_id was updated
-- to the new auth UUID during migration. This syncs them by copying user_id
-- into id and cascading the change to all referencing tables.

BEGIN;

-- Disable FK trigger checks for this session so we can update PK + FKs
-- atomically without violating constraints mid-transaction.
SET session_replication_role = 'replica';

-- 1. property_agents (FK: agent_id → agents.id ON DELETE CASCADE)
UPDATE public.property_agents pa
SET agent_id = a.user_id
FROM public.agents a
WHERE pa.agent_id = a.id
  AND a.user_id IS NOT NULL
  AND a.id != a.user_id;

-- 2. conversations (FK: assigned_agent_id → agents.id ON DELETE SET NULL)
UPDATE public.conversations c
SET assigned_agent_id = a.user_id
FROM public.agents a
WHERE c.assigned_agent_id = a.id
  AND a.user_id IS NOT NULL
  AND a.id != a.user_id;

-- 3. ai_agents (FK: linked_agent_id → agents.id ON DELETE SET NULL)
UPDATE public.ai_agents ai
SET linked_agent_id = a.user_id
FROM public.agents a
WHERE ai.linked_agent_id = a.id
  AND a.user_id IS NOT NULL
  AND a.id != a.user_id;

-- 4. agent_complaints (no FK constraint, plain UUID column)
UPDATE public.agent_complaints ac
SET agent_id = a.user_id
FROM public.agents a
WHERE ac.agent_id = a.id
  AND a.user_id IS NOT NULL
  AND a.id != a.user_id;

-- 5. Finally update the primary key itself
UPDATE public.agents
SET id = user_id
WHERE user_id IS NOT NULL
  AND id != user_id;

SET session_replication_role = 'origin';

COMMIT;
