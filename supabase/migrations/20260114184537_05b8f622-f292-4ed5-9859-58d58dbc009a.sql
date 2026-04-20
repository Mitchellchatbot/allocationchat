-- Add new lead capture fields for natural collection and insurance card uploads
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS require_insurance_card_before_chat BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS natural_lead_capture_enabled BOOLEAN DEFAULT true;