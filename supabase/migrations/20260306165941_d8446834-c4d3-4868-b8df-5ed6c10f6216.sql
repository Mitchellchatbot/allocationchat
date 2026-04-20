
-- Drop the existing foreign key and re-add with ON DELETE SET NULL
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_invited_by_fkey;
ALTER TABLE public.agents ADD CONSTRAINT agents_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Also handle account_co_owners referencing auth.users
ALTER TABLE public.account_co_owners DROP CONSTRAINT IF EXISTS account_co_owners_owner_user_id_fkey;
ALTER TABLE public.account_co_owners DROP CONSTRAINT IF EXISTS account_co_owners_co_owner_user_id_fkey;
