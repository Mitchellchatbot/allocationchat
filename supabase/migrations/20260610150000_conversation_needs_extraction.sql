-- needs_extraction is the explicit signal that a conversation has unprocessed
-- visitor messages. widget-save-message sets it to true on every visitor
-- message; extract-visitor-info clears it to false after a successful run.
-- The cron filters on this flag instead of a fragile time window, so chats
-- that close right after a late visitor message no longer get their final
-- email/age/phone stranded in the transcript.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS needs_extraction BOOLEAN NOT NULL DEFAULT true;

-- Backfill: any existing conversation with visitor messages newer than its
-- last extraction (or no extraction yet) should be flagged so the new cron
-- run picks them up on the next tick.
UPDATE conversations
   SET needs_extraction = true
 WHERE last_extraction_at IS NULL
    OR last_extraction_at < last_visitor_message_at;

CREATE INDEX IF NOT EXISTS idx_conversations_needs_extraction
  ON conversations (needs_extraction)
  WHERE needs_extraction = true;
