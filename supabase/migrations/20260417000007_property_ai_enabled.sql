-- Add a property-level AI kill switch.
-- When false, new conversations on that property start with ai_enabled = false
-- and the widget won't call chat-ai at all.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true;
