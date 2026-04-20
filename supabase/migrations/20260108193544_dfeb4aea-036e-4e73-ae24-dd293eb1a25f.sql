-- Add typing speed WPM setting to properties
ALTER TABLE public.properties 
ADD COLUMN typing_wpm integer DEFAULT 90;