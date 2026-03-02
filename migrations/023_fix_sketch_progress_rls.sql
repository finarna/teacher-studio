-- Migration 023: Fix Sketch Progress RLS
-- Created: 2026-03-02
-- Purpose: Resolve 403 Forbidden on Learn Tab when marking sketches as mastered

-- 1. Ensure RLS is enabled
ALTER TABLE public.sketch_progress ENABLE ROW LEVEL SECURITY;

-- 2. Drop specific policies that might be blocking upsert
DROP POLICY IF EXISTS "Users can view own sketch progress" ON public.sketch_progress;
DROP POLICY IF EXISTS "Users can insert own sketch progress" ON public.sketch_progress;
DROP POLICY IF EXISTS "Users can update own sketch progress" ON public.sketch_progress;
DROP POLICY IF EXISTS "Users can manage own sketch progress" ON public.sketch_progress;

-- 3. Create a unified "manage" policy for upsert compatibility
CREATE POLICY "Users can manage own sketch progress" ON public.sketch_progress
  FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 4. Verify topic_sketches also has proper SELECT access for system scans 
-- (This was already in v6.0 but good to reinforce)
DROP POLICY IF EXISTS "Users can view topic sketches" ON public.topic_sketches;
CREATE POLICY "Users can view topic sketches" ON public.topic_sketches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans s 
      WHERE s.id = scan_id 
      AND (s.user_id = auth.uid() OR s.is_system_scan = true)
    )
    OR public.is_admin()
  );
