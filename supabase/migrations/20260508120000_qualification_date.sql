-- Date the doctor obtained their specialty qualification (free-form text — could be a year, month/year, or full date as the doctor stated it).
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS qualification_date TEXT;
