-- A persona dropped onto Google Ads landing pages needs its leads filed under a
-- different Zoho Lead_Source than the generic site chatbot, so paid traffic can
-- be reported on separately. NULL means "use the default" — only the Google Ads
-- persona carries a value.
--
-- Lead_Source is a Zoho picklist, and Zoho accepts then silently discards a
-- value that isn't an existing option. Values stored here must match an option
-- in the org's Lead Source picklist exactly.
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS lead_source TEXT;

-- The persona that opened the chat. Stamped at conversation creation rather than
-- read at export time, because the widget rotates through every persona assigned
-- to a property, so "which persona handled this" is not recoverable afterwards.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL;
