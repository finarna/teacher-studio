-- Migration: Fix uniqueness for ai_universal_calibration
-- This ensures the Upsert logic in lib/reiEvolutionEngine.ts works correctly
-- and accounts for subject-specific calibrations.

ALTER TABLE ai_universal_calibration 
ADD COLUMN IF NOT EXISTS subject TEXT;

-- Drop the old non-unique index
DROP INDEX IF EXISTS idx_calibration_exam_year;

-- Create a UNIQUE constraint for the upsert logic
-- Calibration is unique per Exam, Subject, and Target Year
CREATE UNIQUE INDEX IF NOT EXISTS idx_calibration_exam_subject_year 
ON ai_universal_calibration (exam_type, subject, target_year);

COMMENT ON COLUMN ai_universal_calibration.subject IS 'The specific subject (Math, Physics, etc.) for this calibration';
