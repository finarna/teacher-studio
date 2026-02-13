-- =====================================================
-- System-Wide Scans Migration
-- Migration: 012 - Add system scan support
-- =====================================================
-- This migration enables:
-- - System-wide question banks accessible to all users
-- - New users can practice immediately without scanning
-- - Existing scans can be marked as system resources
-- =====================================================

-- Add is_system_scan column to scans table
ALTER TABLE scans
ADD COLUMN IF NOT EXISTS is_system_scan BOOLEAN DEFAULT FALSE;

-- Add index for efficient system scan queries
CREATE INDEX IF NOT EXISTS idx_scans_system ON scans(is_system_scan, subject, exam_context)
WHERE is_system_scan = TRUE;

-- Add comment
COMMENT ON COLUMN scans.is_system_scan IS 'If true, this scan is available to all users as a system resource';

-- Mark ONLY the latest scan per (subject, exam_context) as system scan
-- This keeps the system clean and makes debugging easier

-- First, clear any existing system scan flags
UPDATE scans SET is_system_scan = FALSE;

-- Mark only the latest scan for each combination
WITH latest_scans AS (
  SELECT DISTINCT ON (subject, exam_context)
    id
  FROM scans
  WHERE status = 'Complete'
    AND exam_context IN ('KCET', 'JEE', 'NEET', 'CBSE')
    AND subject IN ('Math', 'Physics', 'Chemistry', 'Biology')
  ORDER BY subject, exam_context, created_at DESC
)
UPDATE scans
SET is_system_scan = TRUE
WHERE id IN (SELECT id FROM latest_scans);
