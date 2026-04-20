-- Add gclid column to visitors table
ALTER TABLE public.visitors 
ADD COLUMN gclid text;