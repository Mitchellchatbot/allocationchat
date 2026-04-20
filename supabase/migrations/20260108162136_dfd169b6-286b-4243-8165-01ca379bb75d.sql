-- Add smart typing toggle to properties
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS smart_typing_enabled boolean DEFAULT false;