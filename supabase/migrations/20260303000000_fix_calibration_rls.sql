-- Migration: Fix RLS for AI Universal Calibration to allow authenticated students to process intelligence
-- REI v3.0 logic requires the client to sometimes persist the forecasted calibration.

-- 1. Enable RLS (just in case it was enabled by default but no policies exist)
ALTER TABLE ai_universal_calibration ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Public read access for calibration" ON ai_universal_calibration;
DROP POLICY IF EXISTS "Authenticated users can read calibration" ON ai_universal_calibration;
DROP POLICY IF EXISTS "Authenticated users can upsert calibration" ON ai_universal_calibration;

-- 3. Create policies
-- Anyone (including anon) should be able to read the calibration data
CREATE POLICY "Public read access for calibration" 
ON ai_universal_calibration FOR SELECT 
TO public 
USING (true);

-- Authenticated users (students) can insert/update calibration data
-- In a production environment, this might be restricted to teachers/admins, 
-- but since our current architecture relies on client-side processing, we allow authenticated users.
CREATE POLICY "Authenticated users can upsert calibration" 
ON ai_universal_calibration FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';
