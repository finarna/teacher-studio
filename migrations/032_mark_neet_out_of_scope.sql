-- Migration 032: Mark questions that are out of scope for NEET 2026
--
-- Based on official NMC/UGMEB NEET (UG) 2026 syllabus (Dec 22, 2025),
-- the following chapters were removed and questions from these topics
-- should not appear in NEET mock tests or learning journeys.
--
-- REMOVED CHAPTERS:
--   Chemistry:  States of Matter, Hydrogen, s-Block Elements,
--               Environmental Chemistry, Surface Chemistry,
--               General Principles and Processes of Isolation of Elements,
--               Chemistry in Everyday Life
--   Botany:     Transport in Plants, Mineral Nutrition, Environmental Issues
--   Zoology:    Digestion and Absorption

-- Step 1: Add the column
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS neet_out_of_scope BOOLEAN DEFAULT FALSE;

-- Step 2: Add index for fast filtering
CREATE INDEX IF NOT EXISTS idx_questions_neet_out_of_scope
  ON public.questions (neet_out_of_scope)
  WHERE neet_out_of_scope = TRUE;

-- Step 3: Mark all NEET-context questions from removed chapters
--   Marks: exam_context = 'NEET' OR exam_context IS NULL (untagged questions
--   that were generated for NEET subjects also get flagged)
UPDATE public.questions
SET neet_out_of_scope = TRUE
WHERE topic IN (
  -- Chemistry (Class 11) — removed
  'States of Matter',
  'Hydrogen',
  's-Block Elements',
  'Environmental Chemistry',
  -- Chemistry (Class 12) — removed
  'Surface Chemistry',
  'General Principles and Processes of Isolation of Elements',
  'Chemistry in Everyday Life',
  -- Botany (Class 11) — removed
  'Transport in Plants',
  'Mineral Nutrition',
  -- Biology/Botany (Class 12) — removed
  'Environmental Issues',
  -- Zoology (Class 11) — removed
  'Digestion and Absorption'
)
AND (exam_context = 'NEET' OR exam_context IS NULL);

-- Step 4: Also update topics table — set NEET exam_weightage to 0 for removed topics
--   This prevents the REI system from requesting questions for these topics in NEET mode
UPDATE public.topics
SET exam_weightage = exam_weightage || '{"NEET": 0}'::jsonb
WHERE name IN (
  'States of Matter',
  'Hydrogen',
  's-Block Elements',
  'Environmental Chemistry',
  'Surface Chemistry',
  'General Principles and Processes of Isolation of Elements',
  'Chemistry in Everyday Life',
  'Transport in Plants',
  'Mineral Nutrition',
  'Environmental Issues',
  'Digestion and Absorption'
);

-- Step 5: Delete stale topic_metadata rows for removed chapters in NEET context
--   seed_rei_v3.ts uses upsert (not delete), so old rows survive a re-seed.
--   This DELETE removes them so the REI system no longer treats them as valid NEET topics.
DELETE FROM public.topic_metadata
WHERE topic_name IN (
  'States of Matter', 'Hydrogen', 's-Block Elements', 'Environmental Chemistry',
  'Surface Chemistry', 'General Principles and Processes of Isolation of Elements',
  'Chemistry in Everyday Life', 'Transport in Plants', 'Mineral Nutrition',
  'Environmental Issues', 'Digestion and Absorption'
)
AND exam_context = 'NEET';

-- Verification queries (run manually after migration to confirm):
--
-- 1. Confirm out-of-scope questions tagged:
-- SELECT topic, exam_context, COUNT(*) AS q_count
-- FROM public.questions
-- WHERE neet_out_of_scope = TRUE
-- GROUP BY topic, exam_context ORDER BY topic;
--
-- 2. Confirm no stale topic_metadata remains for NEET:
-- SELECT topic_name, exam_context FROM public.topic_metadata
-- WHERE topic_name IN ('States of Matter','Hydrogen','Transport in Plants',
--   'Mineral Nutrition','Environmental Issues','Digestion and Absorption',
--   'Surface Chemistry','General Principles and Processes of Isolation of Elements',
--   'Chemistry in Everyday Life','s-Block Elements','Environmental Chemistry')
-- AND exam_context = 'NEET';
--
-- 3. Confirm topics weightage updated:
-- SELECT name, exam_weightage->>'NEET' AS neet_weight
-- FROM public.topics
-- WHERE name IN ('Transport in Plants','Mineral Nutrition','Digestion and Absorption');
