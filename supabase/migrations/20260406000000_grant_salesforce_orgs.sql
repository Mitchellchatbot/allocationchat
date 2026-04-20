-- Grant table-level SELECT/INSERT/UPDATE/DELETE to authenticated role
-- (RLS policies control which rows each user can access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salesforce_orgs TO authenticated;
