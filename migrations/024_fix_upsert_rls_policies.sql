-- Migration 024: Fix Upsert RLS Policies
-- Created: 2026-03-02
-- Purpose: Add explicit 'WITH CHECK' clauses to 'FOR ALL' RLS policies for tables that use upserts.
-- This prevents 403 Forbidden errors across the Practice, Quiz, and Learn tabs.

-- 1. Topic Resources (Learning Journey progress)
DROP POLICY IF EXISTS "Resources access" ON public.topic_resources;
CREATE POLICY "Resources access" ON public.topic_resources 
  FOR ALL 
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 2. Practice Sessions
DROP POLICY IF EXISTS "Practice session access" ON public.practice_sessions;
CREATE POLICY "Practice session access" ON public.practice_sessions 
  FOR ALL 
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 3. Quiz Attempts
DROP POLICY IF EXISTS "Quiz access" ON public.quiz_attempts;
CREATE POLICY "Quiz access" ON public.quiz_attempts 
  FOR ALL 
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 4. Practice Answers
DROP POLICY IF EXISTS "Practice access" ON public.practice_answers;
CREATE POLICY "Practice access" ON public.practice_answers 
  FOR ALL 
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 5. Vidya (AI Chat) Sessions
DROP POLICY IF EXISTS "Vidya access" ON public.vidya_sessions;
CREATE POLICY "Vidya access" ON public.vidya_sessions 
  FOR ALL 
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 6. Sketch Progress (Learn Tab Mastered Button)
DROP POLICY IF EXISTS "Users can manage own sketch progress" ON public.sketch_progress;
CREATE POLICY "Users can manage own sketch progress" ON public.sketch_progress 
  FOR ALL 
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 7. Test Attempts
DROP POLICY IF EXISTS "Test attempts access" ON public.test_attempts;
CREATE POLICY "Test attempts access" ON public.test_attempts 
  FOR ALL 
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
