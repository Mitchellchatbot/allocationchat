ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS drop_capitalization_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS drop_apostrophes_enabled boolean DEFAULT true;