ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_visitor_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_extraction_at timestamptz;