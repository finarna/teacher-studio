-- =====================================================
-- Migration 004: Add exam_context to scans table
-- =====================================================
-- Adds exam context (KCET, NEET, JEE, CBSE) support
-- for multi-exam filtering
-- =====================================================

-- Add exam_context column to scans table
ALTER TABLE scans ADD COLUMN IF NOT EXISTS exam_context TEXT;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_scans_exam_context ON scans(exam_context);

-- Create composite index for subject + exam filtering
CREATE INDEX IF NOT EXISTS idx_scans_subject_exam ON scans(subject, exam_context);

-- Add check constraint for valid exam contexts
ALTER TABLE scans DROP CONSTRAINT IF EXISTS check_exam_context;
ALTER TABLE scans ADD CONSTRAINT check_exam_context
  CHECK (exam_context IN ('KCET', 'NEET', 'JEE', 'CBSE'));

-- Add comment
COMMENT ON COLUMN scans.exam_context IS 'Exam board context: KCET, NEET, JEE, or CBSE';

-- =====================================================
-- Default Values for Existing Scans
-- =====================================================
-- Update existing scans without exam_context based on subject
-- Default mappings:
--   Math → KCET
--   Physics → KCET
--   Chemistry → KCET
--   Biology → NEET
-- =====================================================

UPDATE scans
SET exam_context = CASE
  WHEN subject = 'Biology' THEN 'NEET'
  ELSE 'KCET'
END
WHERE exam_context IS NULL;

-- =====================================================
-- Verification
-- =====================================================
-- Run this to verify migration:
-- SELECT subject, exam_context, COUNT(*)
-- FROM scans
-- GROUP BY subject, exam_context
-- ORDER BY subject, exam_context;
-- =====================================================
