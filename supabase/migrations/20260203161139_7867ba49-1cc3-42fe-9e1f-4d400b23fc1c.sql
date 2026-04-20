-- Add ai_enabled column to conversations table to persist AI toggle state
ALTER TABLE public.conversations 
ADD COLUMN ai_enabled boolean NOT NULL DEFAULT true;