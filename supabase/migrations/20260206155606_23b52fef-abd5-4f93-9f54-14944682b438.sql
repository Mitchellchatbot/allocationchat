
-- Add widget effect columns to properties table
ALTER TABLE public.properties
  ADD COLUMN widget_effect_type text DEFAULT 'none',
  ADD COLUMN widget_effect_interval_seconds integer DEFAULT 5,
  ADD COLUMN widget_effect_intensity text DEFAULT 'medium';
