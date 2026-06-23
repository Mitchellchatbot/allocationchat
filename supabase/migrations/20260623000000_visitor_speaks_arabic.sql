-- Family Medicine / GP doctors are only placed if they speak Arabic.
-- Store the extracted language signal so the qualification + export gates can
-- enforce it deterministically (not just via the chat prompt).
--   NULL  = not yet known / not discussed
--   TRUE  = doctor confirmed they speak Arabic
--   FALSE = doctor confirmed they do NOT speak Arabic
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS speaks_arabic BOOLEAN DEFAULT NULL;
