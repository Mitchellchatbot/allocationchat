ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS quick_reply_after_first_enabled boolean DEFAULT false;
