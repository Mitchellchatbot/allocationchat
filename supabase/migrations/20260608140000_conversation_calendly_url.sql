-- Cache the Calendly URL picked for each conversation so all three Calendly
-- paths (chat-ai prompt embed, decline fallback, silence fallback) show the
-- same link to the doctor and the link rotates across the team in strict
-- round-robin based on conversation creation order.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS calendly_url TEXT;
