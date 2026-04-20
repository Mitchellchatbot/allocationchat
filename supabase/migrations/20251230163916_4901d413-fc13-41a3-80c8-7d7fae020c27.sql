-- Add is_test column to conversations table to mark test conversations from widget preview
ALTER TABLE public.conversations ADD COLUMN is_test boolean NOT NULL DEFAULT false;