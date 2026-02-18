-- Migration: Add year column to scans table for Learning Journey Past Year Exams feature
-- This allows filtering and grouping scans by year in the Learning Journey

ALTER TABLE scans
ADD COLUMN IF NOT EXISTS year TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_scans_year_subject_exam
ON scans(year, subject, exam_context)
WHERE year IS NOT NULL;

-- Add comment
COMMENT ON COLUMN scans.year IS 'Year of the exam paper (e.g., "2024", "2023") - extracted from filename';

-- Backfill year for existing scans by extracting from name
-- This will attempt to extract 4-digit years (19xx or 20xx) from scan names
UPDATE scans
SET year = (
  SELECT substring(name from '(19[0-9]{2}|20[0-9]{2})')
)
WHERE year IS NULL
AND name ~ '(19[0-9]{2}|20[0-9]{2})';

-- Log results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM scans WHERE year IS NOT NULL;
  RAISE NOTICE 'Migration complete: % scans now have year field', updated_count;
END $$;
