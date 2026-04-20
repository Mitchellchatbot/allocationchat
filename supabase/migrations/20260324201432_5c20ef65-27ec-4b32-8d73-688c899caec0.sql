ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS sf_export_ready_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sf_export_trigger text DEFAULT NULL;