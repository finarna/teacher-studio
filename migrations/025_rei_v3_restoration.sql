-- ============================================================
-- 🧠 REI v3.0 RESTORATION & AI GENERATOR SCHEME UPGRADE
-- ============================================================
-- Migration: 025_rei_v3_restoration.sql
-- Description: Adds missing columns for REI v3.0 Oracle and fixes question counts.
-- ============================================================

-- 1. Upgrade exam_configurations with specific columns for the generator
ALTER TABLE public.exam_configurations 
ADD COLUMN IF NOT EXISTS exam_context TEXT,
ADD COLUMN IF NOT EXISTS total_questions INTEGER,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS marks_per_question NUMERIC,
ADD COLUMN IF NOT EXISTS passing_percentage NUMERIC DEFAULT 33,
ADD COLUMN IF NOT EXISTS negative_marking_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS negative_marking_deduction NUMERIC DEFAULT 0;

-- Ensure uniqueness for the new columns
ALTER TABLE public.exam_configurations 
DROP CONSTRAINT IF EXISTS exam_configurations_exam_context_subject_key;

ALTER TABLE public.exam_configurations 
ADD CONSTRAINT exam_configurations_env_unique UNIQUE(exam_context, subject);

-- 2. Create generation_rules table (MISSING in v5/v6 generic schema)
CREATE TABLE IF NOT EXISTS public.generation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_context TEXT NOT NULL,
  subject TEXT,
  weight_predicted_pattern NUMERIC DEFAULT 0.4 CHECK (weight_predicted_pattern BETWEEN 0 AND 1),
  weight_student_weak_areas NUMERIC DEFAULT 0.3 CHECK (weight_student_weak_areas BETWEEN 0 AND 1),
  weight_curriculum_balance NUMERIC DEFAULT 0.2 CHECK (weight_curriculum_balance BETWEEN 0 AND 1),
  weight_recent_trends NUMERIC DEFAULT 0.1 CHECK (weight_recent_trends BETWEEN 0 AND 1),
  strategy_mode TEXT DEFAULT 'hybrid', -- 'predictive_mock', 'adaptive', 'hybrid'
  adaptive_difficulty_enabled BOOLEAN DEFAULT true,
  adaptive_baseline_accuracy NUMERIC DEFAULT 60,
  adaptive_step_size NUMERIC DEFAULT 0.1,
  avoid_recent_questions BOOLEAN DEFAULT true,
  days_since_last_attempt INTEGER DEFAULT 30,
  max_repetition_allowed INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_context, subject)
);

-- 3. Upgrade topic_metadata with estimated_difficulty
ALTER TABLE public.topic_metadata 
ADD COLUMN IF NOT EXISTS estimated_difficulty INTEGER CHECK (estimated_difficulty BETWEEN 1 AND 10);

-- 4. Upgrade ai_universal_calibration with REI v3.0 high-fidelity columns
-- (This bridges Processed Intelligence from REI v3.0 Phase 2)
ALTER TABLE public.ai_universal_calibration 
ADD COLUMN IF NOT EXISTS exam_type TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS target_year INTEGER,
ADD COLUMN IF NOT EXISTS rigor_velocity NUMERIC,
ADD COLUMN IF NOT EXISTS intent_signature JSONB,
ADD COLUMN IF NOT EXISTS calibration_directives TEXT[],
ADD COLUMN IF NOT EXISTS board_signature TEXT;

-- Move from calibration_key to v3.0 unique constraint
ALTER TABLE public.ai_universal_calibration 
DROP CONSTRAINT IF EXISTS ai_universal_calibration_calibration_key_key;

ALTER TABLE public.ai_universal_calibration 
ADD CONSTRAINT ai_universal_calib_unique_v3 UNIQUE (exam_type, subject, target_year);

-- 5. Add RLS for the new tables
ALTER TABLE public.generation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Generation rules viewable by everyone" ON public.generation_rules;
CREATE POLICY "Generation rules viewable by everyone" ON public.generation_rules FOR SELECT USING (true);

-- 6. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN public.exam_configurations.exam_context IS 'Exam type (KCET, JEE, NEET, CBSE) for direct mapping';
COMMENT ON COLUMN public.ai_universal_calibration.rigor_velocity IS 'The acceleration of rigor relative to the norm calculated by REI v3.0';
