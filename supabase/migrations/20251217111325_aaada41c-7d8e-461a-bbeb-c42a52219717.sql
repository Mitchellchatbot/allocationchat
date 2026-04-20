-- Add 'client' and 'agent' to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'client';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'agent';