-- Migration: Final Fix for AI Universal Calibration Uniqueness and Schema Cache
-- This ensures the REI v3.0 Oracle can persist subject-specific intelligence signatures.

-- 1. Add missing subject column
ALTER TABLE ai_universal_calibration 
ADD COLUMN IF NOT EXISTS subject TEXT;

-- 2. Backfill existing records to 'Math' since current testing focus is Mathematics
UPDATE ai_universal_calibration SET subject = 'Math' WHERE subject IS NULL;

-- 3. Make subject NOT NULL if desired, but for now we just need the index
-- ALTER TABLE ai_universal_calibration ALTER COLUMN subject SET NOT NULL;

-- 4. Drop the old non-unique lookup index
DROP INDEX IF EXISTS idx_calibration_exam_year;

-- 5. Create the UNIQUE index required for Supabase Upsert (on_conflict)
DROP INDEX IF EXISTS idx_calibration_exam_subject_year;
CREATE UNIQUE INDEX idx_calibration_exam_subject_year 
ON ai_universal_calibration (exam_type, subject, target_year);

-- 6. Reload the PostgREST schema cache so the 'subject' column is visible to the API
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN ai_universal_calibration.subject IS 'Subject identifier for granular calibration (Math, Physics, etc.)';
