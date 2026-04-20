
ALTER TABLE public.salesforce_settings
  ADD COLUMN IF NOT EXISTS include_insurance_card_attachment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS insurance_card_lead_status text DEFAULT NULL;
