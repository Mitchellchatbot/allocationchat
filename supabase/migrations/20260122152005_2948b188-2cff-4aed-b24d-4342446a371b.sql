-- Add avatar_url column to profiles table for all users
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to the user profile image stored in agent-avatars bucket';