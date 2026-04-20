-- Add base AI prompt field to properties table
ALTER TABLE public.properties 
ADD COLUMN ai_base_prompt TEXT DEFAULT NULL;