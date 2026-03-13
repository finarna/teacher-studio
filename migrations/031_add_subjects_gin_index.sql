-- Migration 031: Add GIN index on scans.subjects (text[]) for fast array-contains queries
-- Without this, `subjects.cs.{Math}` (PostgREST array-contains) forces a full table scan
-- and hits Supabase's 8s statement timeout when multiple concurrent queries run on page load
-- (e.g. SubjectMenuPage + PastYearExamsPage both fire the same query simultaneously).

-- GIN index enables fast @> (array-contains) lookups on the subjects text[] column
CREATE INDEX IF NOT EXISTS idx_scans_subjects_gin ON public.scans USING GIN(subjects);

-- exam_context is filtered on every PYQ query but was previously unindexed
CREATE INDEX IF NOT EXISTS idx_scans_exam_context ON public.scans(exam_context);

-- Composite index for the most common PYQ query pattern
CREATE INDEX IF NOT EXISTS idx_scans_subject_exam_system ON public.scans(subject, exam_context, is_system_scan);
