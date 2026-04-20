
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS ai_collect_insurance_company boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_collect_member_id boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_collect_date_of_birth boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_insurance_collection_enabled boolean DEFAULT true;
