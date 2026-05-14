-- Tracks when the AI last asked the doctor for their phone number, so a cron
-- can send the Calendly follow-up if they don't reply within 1 minute.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS phone_asked_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS phone_followup_sent BOOLEAN NOT NULL DEFAULT FALSE;
