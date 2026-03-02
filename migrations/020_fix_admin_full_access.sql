-- ============================================================
-- 🛡️ MIGRATION 020: FULL ADMIN & OWNER PERMISSIONS
-- ============================================================
-- Description: Adds missing UPDATE and DELETE policies for core tables
-- to allow the Admin Dashboard to function correctly.
-- ============================================================

-- Scans Table
DROP POLICY IF EXISTS "Users update own scans" ON public.scans;
CREATE POLICY "Users update own scans" ON public.scans 
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users delete own scans" ON public.scans;
CREATE POLICY "Users delete own scans" ON public.scans 
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- Questions Table
DROP POLICY IF EXISTS "Users update own questions" ON public.questions;
CREATE POLICY "Users update own questions" ON public.questions 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM scans s WHERE s.id = scan_id AND s.user_id = auth.uid()) 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users delete own questions" ON public.questions;
CREATE POLICY "Users delete own questions" ON public.questions 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM scans s WHERE s.id = scan_id AND s.user_id = auth.uid()) 
    OR public.is_admin()
  );

-- Topic Question Mapping Table
DROP POLICY IF EXISTS "Allow delete topic mappings" ON public.topic_question_mapping;
CREATE POLICY "Allow delete topic mappings" ON public.topic_question_mapping
  FOR DELETE USING (public.is_admin());

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 020: Full Admin & Owner permissions applied!';
END $$;
