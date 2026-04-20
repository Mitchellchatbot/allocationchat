-- Add client credentials columns to salesforce_settings
ALTER TABLE public.salesforce_settings
ADD COLUMN IF NOT EXISTS client_id text,
ADD COLUMN IF NOT EXISTS client_secret text;