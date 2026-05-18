-- Per-property default Zoho lead owner. When set, zoho-export-leads stamps
-- this user id on every lead it creates so all chatbot leads land with the
-- chosen owner instead of defaulting to whoever connected the OAuth token.
ALTER TABLE zoho_connections ADD COLUMN IF NOT EXISTS default_owner_id TEXT;
