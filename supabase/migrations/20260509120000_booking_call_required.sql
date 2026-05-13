-- Tracks doctors who declined or didn't reply to the phone-number question.
-- These leads should land in Zoho with a different status so the recruitment
-- team knows to reach out via the Calendly booking flow instead.
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS booking_call_required BOOLEAN NOT NULL DEFAULT FALSE;
