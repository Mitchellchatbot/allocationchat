-- Add dashboard_tour_complete column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN dashboard_tour_complete boolean NOT NULL DEFAULT false;