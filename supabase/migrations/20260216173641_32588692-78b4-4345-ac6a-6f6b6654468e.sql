
-- Drop duplicate unique constraints on user_id in agents table
-- A user can be an agent invited by multiple different admins
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_user_id_key;
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_user_id_unique;
