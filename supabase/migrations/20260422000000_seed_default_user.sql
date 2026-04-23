-- Default admin user is created via the Supabase Admin API at deploy time.
-- See deployment instructions: email=admin@allocationassist.com password=Admin123!
-- This migration is intentionally a no-op; direct auth.users inserts are
-- incompatible with GoTrue's password hashing on hosted Supabase.
SELECT 1;
