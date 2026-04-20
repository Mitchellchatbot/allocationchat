-- Add widget_icon column to properties table
ALTER TABLE public.properties 
ADD COLUMN widget_icon text DEFAULT 'message-circle';