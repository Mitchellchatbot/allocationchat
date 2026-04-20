-- Add new columns to visitors table for additional extracted info
ALTER TABLE public.visitors 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS age text,
ADD COLUMN IF NOT EXISTS occupation text;

-- Add comment for clarity
COMMENT ON COLUMN public.visitors.phone IS 'Phone number extracted from conversation';
COMMENT ON COLUMN public.visitors.age IS 'Age extracted from conversation';
COMMENT ON COLUMN public.visitors.occupation IS 'Occupation extracted from conversation';