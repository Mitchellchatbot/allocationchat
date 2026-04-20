
ALTER TABLE public.properties
  ADD COLUMN geo_filter_mode text NOT NULL DEFAULT 'anywhere',
  ADD COLUMN geo_allowed_states text[] NOT NULL DEFAULT '{}',
  ADD COLUMN geo_blocked_message text;
