-- ============================================================
-- 🔧 FIX KCET WEIGHTAGE FOR MATH TOPICS
-- ============================================================
-- Run this in Supabase SQL Editor to add KCET weightage to Math topics
-- This will make topics visible in KCET Learning Journey
-- ============================================================

-- Update all Math topics to include KCET weightage
UPDATE public.topics
SET exam_weightage = jsonb_set(
  COALESCE(exam_weightage, '{}'::jsonb),
  '{KCET}',
  '4'::jsonb
)
WHERE subject = 'Math'
  AND (exam_weightage IS NULL OR exam_weightage->>'KCET' IS NULL);

-- Show summary
DO $$
DECLARE
    total_topics INTEGER;
    topics_with_kcet INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_topics FROM public.topics WHERE subject = 'Math';
    SELECT COUNT(*) INTO topics_with_kcet FROM public.topics WHERE subject = 'Math' AND exam_weightage->>'KCET' IS NOT NULL;

    RAISE NOTICE '✅ Fix applied successfully!';
    RAISE NOTICE '📊 Total Math topics: %', total_topics;
    RAISE NOTICE '📊 Math topics with KCET weightage: %', topics_with_kcet;
END $$;
