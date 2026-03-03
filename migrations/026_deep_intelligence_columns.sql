-- ============================================================
-- 🧠 DEEP INTELLIGENCE COLUMN UPGRADE
-- ============================================================
-- Migration: 026_deep_intelligence_columns.sql
-- Description: Adds technical depth columns to questions for premium REI v3.0 insights.
-- ============================================================

ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS historical_pattern TEXT,
ADD COLUMN IF NOT EXISTS predictive_insight TEXT,
ADD COLUMN IF NOT EXISTS why_it_matters TEXT,
ADD COLUMN IF NOT EXISTS study_tip TEXT;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN public.questions.ai_reasoning IS 'Technical mindset/trap explanation from AI Synthesis';
COMMENT ON COLUMN public.questions.historical_pattern IS 'Exam frequency and evolution context';
COMMENT ON COLUMN public.questions.predictive_insight IS 'Likely future variations of this specific question';
COMMENT ON COLUMN public.questions.why_it_matters IS 'Practical or higher-level conceptual relevance';
