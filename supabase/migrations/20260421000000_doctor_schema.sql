-- Doctor recruitment schema: replace behavioral health fields with doctor-specific fields

-- Remove behavioral health columns from visitors
ALTER TABLE visitors DROP COLUMN IF EXISTS drug_of_choice;
ALTER TABLE visitors DROP COLUMN IF EXISTS addiction_history;
ALTER TABLE visitors DROP COLUMN IF EXISTS treatment_interest;
ALTER TABLE visitors DROP COLUMN IF EXISTS urgency_level;
ALTER TABLE visitors DROP COLUMN IF EXISTS insurance_info;
ALTER TABLE visitors DROP COLUMN IF EXISTS insurance_card_url;
ALTER TABLE visitors DROP COLUMN IF EXISTS member_id;
ALTER TABLE visitors DROP COLUMN IF EXISTS insurance_company;
ALTER TABLE visitors DROP COLUMN IF EXISTS occupation;
ALTER TABLE visitors DROP COLUMN IF EXISTS date_of_birth;

-- Add doctor-specific columns to visitors
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS country_of_training TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS qualified BOOLEAN DEFAULT NULL;

-- Remove insurance/behavioral health columns from properties
ALTER TABLE properties DROP COLUMN IF EXISTS ai_insurance_collection_enabled;
ALTER TABLE properties DROP COLUMN IF EXISTS ai_collect_insurance_company;
ALTER TABLE properties DROP COLUMN IF EXISTS ai_collect_member_id;
ALTER TABLE properties DROP COLUMN IF EXISTS ai_collect_date_of_birth;
ALTER TABLE properties DROP COLUMN IF EXISTS insurance_collection_prompt;
ALTER TABLE properties DROP COLUMN IF EXISTS require_insurance_card_before_chat;

-- Remove Salesforce columns from conversations
ALTER TABLE conversations DROP COLUMN IF EXISTS sf_export_ready_at;
ALTER TABLE conversations DROP COLUMN IF EXISTS sf_export_trigger;
ALTER TABLE conversations DROP COLUMN IF EXISTS sf_lead_id;

-- Zoho CRM connection (one per property)
CREATE TABLE IF NOT EXISTS zoho_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT,
  api_domain TEXT NOT NULL DEFAULT 'https://www.zohoapis.com',
  data_center TEXT NOT NULL DEFAULT 'com',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(property_id)
);

-- Track which visitors have been exported to Zoho
CREATE TABLE IF NOT EXISTS zoho_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  zoho_lead_id TEXT,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(visitor_id)
);

-- Export queue (deferred, auto-processed)
CREATE TABLE IF NOT EXISTS zoho_export_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  visitor_id UUID NOT NULL,
  conversation_id UUID,
  trigger_type TEXT NOT NULL DEFAULT 'auto',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, skipped
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exported_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(visitor_id, trigger_type)
);

-- RLS
ALTER TABLE zoho_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoho_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoho_export_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own Zoho connections"
  ON zoho_connections FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users view own Zoho exports"
  ON zoho_exports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM visitors v
      JOIN conversations c ON c.visitor_id = v.id
      JOIN properties p ON p.id = c.property_id
      WHERE v.id = zoho_exports.visitor_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users view own Zoho export queue"
  ON zoho_export_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = zoho_export_queue.property_id AND p.user_id = auth.uid()
    )
  );

-- Service role full access
GRANT ALL ON zoho_connections TO service_role;
GRANT ALL ON zoho_exports TO service_role;
GRANT ALL ON zoho_export_queue TO service_role;
