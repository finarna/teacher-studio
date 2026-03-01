-- ============================================================
-- Migration 011: Sync questions table with CLEAN_START_SCHEMA_v5
-- Adds missing columns: domain, subject, exam_context, pedagogy
-- These are needed for Learning Journey filtering and were missing from v5
-- ============================================================

-- Add missing columns (idempotent)
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS exam_context TEXT CHECK (exam_context IN ('NEET', 'JEE', 'KCET', 'CBSE'));
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS pedagogy TEXT CHECK (pedagogy IN ('Conceptual', 'Analytical', 'Problem-Solving', 'Application', 'Critical-Thinking', 'Numerical', 'Memorization'));

-- Create indexes for filtering performance
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

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN questions.domain IS 'Subject domain/chapter (e.g., "ALGEBRA", "CALCULUS", "Mechanics", "Organic Chemistry")';
COMMENT ON COLUMN questions.subject IS 'Subject: Physics, Chemistry, Math, Biology (needed for Learning Journey)';
COMMENT ON COLUMN questions.exam_context IS 'Exam context: NEET, JEE, KCET, CBSE (needed for filtering)';
COMMENT ON COLUMN questions.pedagogy IS 'Question type: Conceptual, Analytical, Problem-Solving, Application, Critical-Thinking, Numerical, Memorization';
