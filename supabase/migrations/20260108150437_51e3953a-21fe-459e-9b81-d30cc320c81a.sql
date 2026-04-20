-- Add phone collection option to properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS require_phone_before_chat boolean DEFAULT false;