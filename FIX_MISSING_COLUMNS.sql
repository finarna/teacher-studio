-- ============================================================
-- 🔧 FIX MISSING COLUMNS & RLS POLICIES
-- ============================================================
-- Run this directly in Supabase SQL Editor to fix:
--   1. Missing columns in questions table (domain, subject, exam_context, pedagogy, year)
--   2. Missing INSERT RLS policy for questions table
--   3. Missing RLS policies for topic_question_mapping table
-- Safe to run - won't delete any data, just adds missing columns and policies
-- ============================================================

-- Add missing columns to questions table
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS exam_context TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS pedagogy TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS year INTEGER;

-- Add CHECK constraints (will only apply to new rows if data already exists)
DO $$
BEGIN
    -- Drop existing constraints if they exist
    ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_exam_context_check;
    ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_pedagogy_check;

    -- Add new constraints
    ALTER TABLE public.questions ADD CONSTRAINT questions_exam_context_check
        CHECK (exam_context IN ('NEET', 'JEE', 'KCET', 'CBSE') OR exam_context IS NULL);

    ALTER TABLE public.questions ADD CONSTRAINT questions_pedagogy_check
        CHECK (pedagogy IN ('Conceptual', 'Analytical', 'Problem-Solving', 'Application', 'Critical-Thinking', 'Numerical', 'Memorization') OR pedagogy IS NULL);
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_questions_year ON public.questions(year);
CREATE INDEX IF NOT EXISTS idx_questions_domain ON public.questions(domain);
CREATE INDEX IF NOT EXISTS idx_questions_pedagogy ON public.questions(pedagogy);
CREATE INDEX IF NOT EXISTS idx_questions_exam_context ON public.questions(exam_context);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject);

-- Backfill subject and exam_context from scans table for existing questions
UPDATE public.questions q
SET
  exam_context = s.exam_context,
  subject = s.subject
FROM public.scans s
WHERE q.scan_id = s.id
  AND (q.exam_context IS NULL OR q.subject IS NULL);

-- Add RLS policy for inserting system questions (CRITICAL - was missing!)
DROP POLICY IF EXISTS "Allow insert system questions" ON public.questions;
CREATE POLICY "Allow insert system questions" ON public.questions
  FOR INSERT
  WITH CHECK (
    is_system_question = true
    OR
    EXISTS (SELECT 1 FROM scans s WHERE s.id = scan_id AND s.user_id = auth.uid())
  );

-- Add RLS policies for topic_question_mapping (CRITICAL - was missing!)
DROP POLICY IF EXISTS "Allow view topic mappings" ON public.topic_question_mapping;
CREATE POLICY "Allow view topic mappings" ON public.topic_question_mapping
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert topic mappings" ON public.topic_question_mapping;
CREATE POLICY "Allow insert topic mappings" ON public.topic_question_mapping
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow update topic mappings" ON public.topic_question_mapping;
CREATE POLICY "Allow update topic mappings" ON public.topic_question_mapping
  FOR UPDATE
  USING (public.is_admin());

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Show summary
DO $$
DECLARE
    total_questions INTEGER;
    filled_questions INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_questions FROM public.questions;
    SELECT COUNT(*) INTO filled_questions FROM public.questions WHERE subject IS NOT NULL AND exam_context IS NOT NULL;

    RAISE NOTICE '✅ Fix applied successfully!';
    RAISE NOTICE '📊 Total questions: %', total_questions;
    RAISE NOTICE '📊 Questions with subject & exam_context: %', filled_questions;
    RAISE NOTICE '🎯 Missing data: % questions need subject/exam_context', (total_questions - filled_questions);
END $$;
