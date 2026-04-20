-- Grant table-level permissions to service_role so edge functions using
-- the service role key can read/write salesforce_orgs
GRANT ALL ON public.salesforce_orgs TO service_role;
