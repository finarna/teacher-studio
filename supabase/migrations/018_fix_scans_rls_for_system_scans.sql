-- Migration: Fix RLS to allow viewing system scans
-- This allows all users to see scans marked as system scans (past year papers)
-- while still restricting access to personal user scans

-- Drop existing policies if they exist (to start fresh)
DROP POLICY IF EXISTS scans_select ON scans;
DROP POLICY IF EXISTS scans_insert ON scans;
DROP POLICY IF EXISTS scans_update ON scans;
DROP POLICY IF EXISTS scans_delete ON scans;

-- Enable RLS on scans table
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Users can see their own scans OR system scans
CREATE POLICY scans_select ON scans
  FOR SELECT
  USING (
    auth.uid() = user_id  -- User's own scans
    OR
    is_system_scan = TRUE  -- System scans (past year papers) visible to all
  );

-- INSERT policy: Users can only insert their own scans
CREATE POLICY scans_insert ON scans
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: Users can only update their own scans
CREATE POLICY scans_update ON scans
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy: Users can only delete their own scans
CREATE POLICY scans_delete ON scans
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add helpful comment
COMMENT ON TABLE scans IS 'Exam paper scans. RLS allows users to see their own scans + all system scans (is_system_scan=TRUE)';
