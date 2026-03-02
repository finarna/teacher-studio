-- ==================================================
-- FIX: Missing RLS policies for practice_sessions
-- ==================================================

-- Ensure RLS is enabled
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing if any (to avoid duplicates)
DROP POLICY IF EXISTS "Practice session access" ON public.practice_sessions;
DROP POLICY IF EXISTS "Users can view own practice sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "Users can insert own practice sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "Users can update own practice sessions" ON public.practice_sessions;

-- Apply consolidated "ALL" policy (style used in v5.6+)
CREATE POLICY "Practice session access" ON public.practice_sessions 
  FOR ALL 
  USING (auth.uid() = user_id OR public.is_admin());

-- Also ensure topic_resources has correct policies (just in case)
DROP POLICY IF EXISTS "Resources access" ON public.topic_resources;
CREATE POLICY "Resources access" ON public.topic_resources 
  FOR ALL 
  USING (auth.uid() = user_id OR public.is_admin());

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
