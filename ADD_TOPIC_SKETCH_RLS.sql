-- ============================================================
-- 🛡️ ADD MISSING RLS POLICIES FOR TOPIC_SKETCHES
-- ============================================================

-- Enable RLS (just in case)
ALTER TABLE public.topic_sketches ENABLE ROW LEVEL SECURITY;

-- 1. Allow users to view topic sketches for their own scans (or system scans)
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

-- 2. Allow admins to insert/update topic sketches
DROP POLICY IF EXISTS "Admins can insert topic sketches" ON public.topic_sketches;
CREATE POLICY "Admins can insert topic sketches" ON public.topic_sketches
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update topic sketches" ON public.topic_sketches;
CREATE POLICY "Admins can update topic sketches" ON public.topic_sketches
  FOR UPDATE
  USING (public.is_admin());

-- 3. Allow admins to delete topic sketches
DROP POLICY IF EXISTS "Admins can delete topic sketches" ON public.topic_sketches;
CREATE POLICY "Admins can delete topic sketches" ON public.topic_sketches
  FOR DELETE
  USING (public.is_admin());

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

RAISE NOTICE '✅ Topic Sketches RLS policies added successfully!';
