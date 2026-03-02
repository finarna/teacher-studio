-- ============================================================
-- 🛡️ MIGRATION 019: TOPIC_SKETCHES RLS POLICIES
-- ============================================================
-- Description: Adds missing Row Level Security policies for the topic_sketches table.
-- This ensures that users can view Study Guides (Visual Notes) for their own scans,
-- while admins have full management access.
-- ============================================================

-- Enable RLS
ALTER TABLE public.topic_sketches ENABLE ROW LEVEL SECURITY;

-- 1. Allow view access (Scan owners, System scans, Admins)
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

-- 2. Allow management access (Admins only)
DROP POLICY IF EXISTS "Admins can insert topic sketches" ON public.topic_sketches;
CREATE POLICY "Admins can insert topic sketches" ON public.topic_sketches
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update topic sketches" ON public.topic_sketches;
CREATE POLICY "Admins can update topic sketches" ON public.topic_sketches
  FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete topic sketches" ON public.topic_sketches;
CREATE POLICY "Admins can delete topic sketches" ON public.topic_sketches
  FOR DELETE
  USING (public.is_admin());

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 019: Topic Sketches RLS policies applied successfully!';
END $$;
