-- Add addiction treatment-specific fields to visitors table
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS addiction_history text,
ADD COLUMN IF NOT EXISTS drug_of_choice text,
ADD COLUMN IF NOT EXISTS treatment_interest text,
ADD COLUMN IF NOT EXISTS insurance_info text,
ADD COLUMN IF NOT EXISTS urgency_level text;