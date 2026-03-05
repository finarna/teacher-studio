-- =====================================================================
-- EDUJOURNEY CLEAN START SCHEMA v7.0
-- =====================================================================
-- Consolidated schema for a brand-new Supabase project.
-- Run this ONCE on an empty database — it replaces all prior versions
-- and all incremental migrations (001 → 029).
--
-- WHAT'S NEW IN v7.0 (vs v6.0):
--   • Added: rei_evolution_configs table (REI v4.0 deep-store)
--   • Added: board_signature, intent_signature, rigor_velocity,
--             ids_actual columns on exam_historical_patterns
--   • Added: Storage bucket + RLS for "edujourney-images"
--   • Fixed: quiz_attempts indexes and dual INSERT policy
--   • Updated: version comment header
--
-- To patch a LIVE DB that is already running v6.0, run ONLY:
--   migrations/028_rei_deep_store.sql
--   migrations/029_storage_visual_rls.sql
--
-- WARNING: Running this on a DB with existing data will DROP nothing
--          (all tables use CREATE TABLE IF NOT EXISTS), but the
--          pricing_plans DELETE + re-INSERT at the bottom will reset
--          plan data. Comment that block out if you want to preserve
--          custom pricing.
-- =====================================================================

-- 0. EXTENSIONS
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 1. IDENTITY & PROFILES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role VARCHAR(20) DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role VARCHAR(20) DEFAULT 'student',
  subscription_status VARCHAR(20) DEFAULT 'inactive',
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================================
-- 2. PAYMENTS & SUBSCRIPTIONS (Razorpay Integrated)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price_inr INTEGER NOT NULL DEFAULT 0,
  billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.pricing_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  razorpay_subscription_id VARCHAR(100) UNIQUE,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  scans_used INTEGER NOT NULL DEFAULT 0,
  scans_limit INTEGER NOT NULL DEFAULT 5,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  razorpay_order_id VARCHAR(100) UNIQUE NOT NULL,
  razorpay_payment_id VARCHAR(100) UNIQUE,
  razorpay_signature VARCHAR(255),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  method VARCHAR(50),
  receipt VARCHAR(100),
  invoice_url TEXT,
  error_code VARCHAR(100),
  error_description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(100) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  template_data JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 3. SCAN & CORE ANALYSIS TABLES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Processing' CHECK (status IN ('Processing', 'Complete', 'Failed')),
  summary TEXT,
  overall_difficulty TEXT CHECK (overall_difficulty IN ('Easy', 'Moderate', 'Hard')),
  analysis_data JSONB,
  difficulty_distribution JSONB,
  blooms_taxonomy JSONB,
  topic_weightage JSONB,
  trends JSONB,
  predictive_topics JSONB,
  faq JSONB,
  strategy JSONB,
  scan_date TIMESTAMPTZ DEFAULT NOW(),
  exam_context TEXT NOT NULL DEFAULT 'KCET',
  year INTEGER,
  is_system_scan BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chapter_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  total_marks INTEGER NOT NULL DEFAULT 0,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Moderate', 'Hard')),
  description TEXT,
  key_concepts JSONB DEFAULT '[]'::jsonb,
  important_formulas JSONB DEFAULT '[]'::jsonb,
  study_resources JSONB DEFAULT '[]'::jsonb,
  preparation_checklist JSONB DEFAULT '[]'::jsonb,
  high_yield_topics JSONB DEFAULT '[]'::jsonb,
  visual_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  marks INTEGER NOT NULL DEFAULT 0,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Moderate', 'Hard')),
  topic TEXT NOT NULL,
  domain TEXT,
  subject TEXT,
  exam_context TEXT CHECK (exam_context IN ('NEET', 'JEE', 'KCET', 'CBSE')),
  pedagogy TEXT CHECK (pedagogy IN ('Conceptual', 'Analytical', 'Problem-Solving', 'Application', 'Critical-Thinking', 'Numerical', 'Memorization')),
  blooms TEXT,
  options JSONB,
  correct_option_index INTEGER,
  solution_steps JSONB DEFAULT '[]'::jsonb,
  exam_tip TEXT,
  study_tip TEXT,
  ai_reasoning TEXT,
  historical_pattern TEXT,
  predictive_insight TEXT,
  why_it_matters TEXT,
  visual_concept TEXT,
  key_formulas JSONB DEFAULT '[]'::jsonb,
  pitfalls JSONB DEFAULT '[]'::jsonb,
  mastery_material JSONB,
  has_visual_element BOOLEAN DEFAULT FALSE,
  visual_element_type TEXT,
  visual_element_description TEXT,
  visual_element_position TEXT CHECK (visual_element_position IN ('above', 'below', 'inline', 'side')),
  visual_bounding_box JSONB,
  diagram_url TEXT,
  sketch_svg_url TEXT,        -- Persisted visual sketch URL (Storage or base64 fallback)
  source TEXT,
  year INTEGER,
  question_order INTEGER,
  is_system_question BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('question', 'topic', 'scan')),
  entity_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT DEFAULT 'image/png',
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  image_type TEXT NOT NULL,
  image_order INTEGER DEFAULT 0,
  alt_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 4. LEARNING JOURNEY & MASTERY
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  domain TEXT,
  grade TEXT NOT NULL,
  description TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('Easy', 'Moderate', 'Hard')),
  estimated_study_hours DECIMAL(4,2),
  exam_weightage JSONB DEFAULT '{}'::jsonb,
  prerequisite_topics UUID[],
  key_concepts JSONB DEFAULT '[]'::jsonb,
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject, name)
);

CREATE TABLE IF NOT EXISTS public.topic_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  exam_context TEXT NOT NULL DEFAULT 'KCET',
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 100),
  study_stage TEXT DEFAULT 'not_started' CHECK (study_stage IN ('not_started', 'studying_notes', 'practicing', 'taking_quiz', 'mastered')),
  notes_completed BOOLEAN DEFAULT FALSE,
  total_questions INTEGER DEFAULT 0,
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  average_accuracy DECIMAL(5,2) DEFAULT 0,
  quizzes_taken INTEGER DEFAULT 0,
  average_quiz_score DECIMAL(5,2) DEFAULT 0,
  last_practiced TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic_id, exam_context)
);

CREATE TABLE IF NOT EXISTS public.topic_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_resource_id UUID NOT NULL REFERENCES public.topic_resources(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('viewed_notes', 'practiced_question', 'completed_quiz', 'reviewed_flashcard')),
  question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  is_correct BOOLEAN,
  time_spent INTEGER,
  activity_timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.topic_question_mapping (
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  confidence DECIMAL(3,2) DEFAULT 1.0,
  mapped_by TEXT DEFAULT 'ai',
  PRIMARY KEY (topic_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.subject_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trajectory_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  overall_mastery INTEGER DEFAULT 0,
  topics_total INTEGER DEFAULT 0,
  topics_mastered INTEGER DEFAULT 0,
  total_questions_attempted INTEGER DEFAULT 0,
  overall_accuracy DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, trajectory_id, subject)
);

-- =====================================================================
-- 5. PRACTICE, QUIZZES & MOCKS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.practice_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  topic_resource_id UUID REFERENCES public.topic_resources(id) ON DELETE CASCADE,
  selected_option INTEGER,
  is_correct BOOLEAN,
  time_spent_seconds INTEGER DEFAULT 0,
  attempt_count INTEGER DEFAULT 1,
  first_attempt_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.bookmarked_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  topic_resource_id UUID REFERENCES public.topic_resources(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_resource_id UUID REFERENCES public.topic_resources(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.test_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('topic_quiz', 'subject_test', 'full_mock', 'custom_mock')),
  test_name TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic_id UUID REFERENCES public.topics(id),
  total_questions INTEGER,
  duration_minutes INTEGER,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  total_duration INTEGER,
  raw_score INTEGER,
  percentage DECIMAL(5,2),
  marks_obtained DECIMAL(6,2),
  marks_total DECIMAL(6,2),
  negative_marks DECIMAL(6,2) DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  questions_attempted INTEGER DEFAULT 0,
  test_config JSONB,
  topic_analysis JSONB,
  time_analysis JSONB,
  ai_report JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.test_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option INTEGER,
  is_correct BOOLEAN,
  time_spent INTEGER,
  marked_for_review BOOLEAN DEFAULT FALSE,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  marks DECIMAL(4,2) DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.test_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  topic_ids UUID[] NOT NULL,
  difficulty_mix JSONB NOT NULL,
  question_count INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_resource_id UUID NOT NULL REFERENCES public.topic_resources(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  questions_data JSONB NOT NULL,
  correct_count INTEGER NOT NULL,
  wrong_count INTEGER NOT NULL,
  accuracy_percentage INTEGER NOT NULL,
  time_spent_seconds INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sketch_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sketch_id TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sketch_id)
);

CREATE TABLE IF NOT EXISTS public.topic_sketches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  title TEXT,
  description TEXT,
  page_count INTEGER DEFAULT 0,
  pages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 6. AI & SYSTEM TABLES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.exam_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_context TEXT NOT NULL,
  subject TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  marks_per_question NUMERIC,
  passing_percentage NUMERIC NOT NULL DEFAULT 33,
  negative_marking_enabled BOOLEAN DEFAULT false,
  negative_marking_deduction NUMERIC DEFAULT 0,
  config_data JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_context, subject)
);

CREATE TABLE IF NOT EXISTS public.generation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_context TEXT NOT NULL,
  subject TEXT,
  weight_predicted_pattern NUMERIC DEFAULT 0.4 CHECK (weight_predicted_pattern BETWEEN 0 AND 1),
  weight_student_weak_areas NUMERIC DEFAULT 0.3 CHECK (weight_student_weak_areas BETWEEN 0 AND 1),
  weight_curriculum_balance NUMERIC DEFAULT 0.2 CHECK (weight_curriculum_balance BETWEEN 0 AND 1),
  weight_recent_trends NUMERIC DEFAULT 0.1 CHECK (weight_recent_trends BETWEEN 0 AND 1),
  strategy_mode TEXT DEFAULT 'hybrid',
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

CREATE TABLE IF NOT EXISTS public.ai_universal_calibration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  target_year INTEGER NOT NULL,
  rigor_velocity NUMERIC DEFAULT 1.0,
  intent_signature JSONB,
  calibration_directives TEXT[],
  board_signature TEXT,
  calibration_key TEXT UNIQUE,
  system_prompt TEXT,
  parameters JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (exam_type, subject, target_year)
);

CREATE TABLE IF NOT EXISTS public.student_performance_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  topic_mastery JSONB,
  predicted_rank INTEGER,
  weak_areas TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.question_banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_key TEXT UNIQUE NOT NULL,
  scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_key TEXT UNIQUE NOT NULL,
  scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vidya_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  context_type TEXT,
  context_id UUID,
  messages JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 7. AI TRENDS TABLES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.exam_historical_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  exam_context TEXT NOT NULL,
  subject TEXT NOT NULL,
  total_marks INTEGER NOT NULL,
  difficulty_easy_pct INTEGER,
  difficulty_moderate_pct INTEGER,
  difficulty_hard_pct INTEGER,
  evolution_note TEXT,
  -- REI v4.0 signature columns (migration 028)
  board_signature TEXT,          -- e.g. 'SYNTHESIZER', 'LOGICIAN'
  intent_signature JSONB,        -- { synthesis: 0.8, speed: 0.9, trap_density: 0.6 }
  rigor_velocity NUMERIC,        -- acceleration detected in this specific year
  ids_actual NUMERIC,            -- measured Item Difficulty Score of the real paper
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year, exam_context, subject)
);

CREATE TABLE IF NOT EXISTS public.exam_topic_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  historical_pattern_id UUID REFERENCES public.exam_historical_patterns(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  average_marks NUMERIC,
  difficulty_easy_count INTEGER DEFAULT 0,
  difficulty_moderate_count INTEGER DEFAULT 0,
  difficulty_hard_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.topic_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id TEXT UNIQUE NOT NULL,
  topic_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  syllabus TEXT,
  estimated_difficulty INTEGER CHECK (estimated_difficulty BETWEEN 1 AND 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 8. REI v4.0 DEEP INTELLIGENCE STORE (new in v7.0)
-- =====================================================================

-- REI Evolution Constants — replaces hardcoded magic numbers
CREATE TABLE IF NOT EXISTS public.rei_evolution_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_context TEXT NOT NULL,
  subject TEXT,
  rigor_drift_multiplier NUMERIC DEFAULT 1.8,
  ids_baseline NUMERIC DEFAULT 0.95,
  synthesis_weight NUMERIC DEFAULT 0.7,
  trap_density_weight NUMERIC DEFAULT 0.8,
  linguistic_load_weight NUMERIC DEFAULT 0.5,
  speed_requirement_weight NUMERIC DEFAULT 0.9,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_context, subject)
);

-- =====================================================================
-- 9. FUNCTIONS
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NULL), 'student')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, email, full_name, role, subscription_status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NULL), 'student', 'inactive')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 10. TRIGGERS
-- =====================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
      'users','profiles','scans','topic_resources','test_templates',
      'sketch_progress','vidya_sessions','practice_answers','pricing_plans',
      'flashcards','question_banks','topic_metadata','rei_evolution_configs'
    )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS tr_update_%I_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER tr_update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- =====================================================================
-- 11. ROW LEVEL SECURITY
-- =====================================================================

-- Enable RLS on every public table
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Identity & Profiles
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles view" ON public.profiles;
CREATE POLICY "Profiles view" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles update" ON public.profiles;
CREATE POLICY "Profiles update" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- Plans & Subscriptions
DROP POLICY IF EXISTS "Public view plans" ON public.pricing_plans;
CREATE POLICY "Public view plans" ON public.pricing_plans FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users view own sub" ON public.subscriptions;
CREATE POLICY "Users view own sub" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users view own payments" ON public.payments;
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users create payments" ON public.payments;
CREATE POLICY "Users create payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Scans
DROP POLICY IF EXISTS "Users view own scans" ON public.scans;
CREATE POLICY "Users view own scans" ON public.scans FOR SELECT USING (auth.uid() = user_id OR public.is_admin() OR is_system_scan = true);

DROP POLICY IF EXISTS "Users conduct scans" ON public.scans;
CREATE POLICY "Users conduct scans" ON public.scans FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own scans" ON public.scans;
CREATE POLICY "Users update own scans" ON public.scans FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users delete own scans" ON public.scans;
CREATE POLICY "Users delete own scans" ON public.scans FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- Questions
DROP POLICY IF EXISTS "Questions access" ON public.questions;
CREATE POLICY "Questions access" ON public.questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM scans s WHERE s.id = scan_id AND (s.user_id = auth.uid() OR s.is_system_scan = true))
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Allow insert system questions" ON public.questions;
CREATE POLICY "Allow insert system questions" ON public.questions FOR INSERT WITH CHECK (
  is_system_question = true
  OR EXISTS (SELECT 1 FROM scans s WHERE s.id = scan_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users update own questions" ON public.questions;
CREATE POLICY "Users update own questions" ON public.questions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM scans s WHERE s.id = scan_id AND s.user_id = auth.uid())
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Users delete own questions" ON public.questions;
CREATE POLICY "Users delete own questions" ON public.questions FOR DELETE USING (
  EXISTS (SELECT 1 FROM scans s WHERE s.id = scan_id AND s.user_id = auth.uid())
  OR public.is_admin()
);

-- Learning Journey
DROP POLICY IF EXISTS "Topics view" ON public.topics;
CREATE POLICY "Topics view" ON public.topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow view topic mappings" ON public.topic_question_mapping;
CREATE POLICY "Allow view topic mappings" ON public.topic_question_mapping FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert topic mappings" ON public.topic_question_mapping;
CREATE POLICY "Allow insert topic mappings" ON public.topic_question_mapping FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow update topic mappings" ON public.topic_question_mapping;
CREATE POLICY "Allow update topic mappings" ON public.topic_question_mapping FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Allow delete topic mappings" ON public.topic_question_mapping;
CREATE POLICY "Allow delete topic mappings" ON public.topic_question_mapping FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Resources access" ON public.topic_resources;
CREATE POLICY "Resources access" ON public.topic_resources
  FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Practice, Quizzes & Mocks
DROP POLICY IF EXISTS "Practice access" ON public.practice_answers;
CREATE POLICY "Practice access" ON public.practice_answers
  FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Practice session access" ON public.practice_sessions;
CREATE POLICY "Practice session access" ON public.practice_sessions
  FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Test attempts access" ON public.test_attempts;
CREATE POLICY "Test attempts access" ON public.test_attempts
  FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Test responses access" ON public.test_responses;
CREATE POLICY "Test responses access" ON public.test_responses FOR ALL USING (
  EXISTS (SELECT 1 FROM test_attempts ta WHERE ta.id = attempt_id AND ta.user_id = auth.uid())
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Quiz access" ON public.quiz_attempts;
CREATE POLICY "Quiz access" ON public.quiz_attempts
  FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can manage own sketch progress" ON public.sketch_progress;
CREATE POLICY "Users can manage own sketch progress" ON public.sketch_progress
  FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Topic Sketches (visual study notes)
DROP POLICY IF EXISTS "Users can view topic sketches" ON public.topic_sketches;
CREATE POLICY "Users can view topic sketches" ON public.topic_sketches FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.scans s WHERE s.id = scan_id AND (s.user_id = auth.uid() OR s.is_system_scan = true))
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Admins can insert topic sketches" ON public.topic_sketches;
CREATE POLICY "Admins can insert topic sketches" ON public.topic_sketches FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update topic sketches" ON public.topic_sketches;
CREATE POLICY "Admins can update topic sketches" ON public.topic_sketches FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete topic sketches" ON public.topic_sketches;
CREATE POLICY "Admins can delete topic sketches" ON public.topic_sketches FOR DELETE USING (public.is_admin());

-- Flashcards
DROP POLICY IF EXISTS "Users can view own flashcards" ON public.flashcards;
CREATE POLICY "Users can view own flashcards" ON public.flashcards FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own flashcards" ON public.flashcards;
CREATE POLICY "Users can create own flashcards" ON public.flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own flashcards" ON public.flashcards;
CREATE POLICY "Users can update own flashcards" ON public.flashcards FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own flashcards" ON public.flashcards;
CREATE POLICY "Users can delete own flashcards" ON public.flashcards FOR DELETE USING (auth.uid() = user_id);

-- Question Banks
DROP POLICY IF EXISTS "Users can view own question banks" ON public.question_banks;
CREATE POLICY "Users can view own question banks" ON public.question_banks FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own question banks" ON public.question_banks;
CREATE POLICY "Users can create own question banks" ON public.question_banks FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own question banks" ON public.question_banks;
CREATE POLICY "Users can update own question banks" ON public.question_banks FOR UPDATE USING (auth.uid() = user_id);

-- AI Universal Calibration
ALTER TABLE public.ai_universal_calibration ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for calibration" ON public.ai_universal_calibration;
CREATE POLICY "Public read access for calibration" ON public.ai_universal_calibration FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can upsert calibration" ON public.ai_universal_calibration;
CREATE POLICY "Authenticated users can upsert calibration" ON public.ai_universal_calibration FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AI Trends (public viewable)
DROP POLICY IF EXISTS "Trends viewable by everyone" ON public.exam_historical_patterns;
CREATE POLICY "Trends viewable by everyone" ON public.exam_historical_patterns FOR SELECT USING (true);

DROP POLICY IF EXISTS "Distributions viewable by everyone" ON public.exam_topic_distributions;
CREATE POLICY "Distributions viewable by everyone" ON public.exam_topic_distributions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Metadata viewable by everyone" ON public.topic_metadata;
CREATE POLICY "Metadata viewable by everyone" ON public.topic_metadata FOR SELECT USING (true);

DROP POLICY IF EXISTS "Exam configs viewable by everyone" ON public.exam_configurations;
CREATE POLICY "Exam configs viewable by everyone" ON public.exam_configurations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Generation rules viewable by everyone" ON public.generation_rules;
CREATE POLICY "Generation rules viewable by everyone" ON public.generation_rules FOR SELECT USING (true);

-- REI Evolution Configs (public viewable)
ALTER TABLE public.rei_evolution_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Configs viewable by everyone" ON public.rei_evolution_configs;
CREATE POLICY "Configs viewable by everyone" ON public.rei_evolution_configs FOR SELECT USING (true);

-- Vidya AI Sessions
DROP POLICY IF EXISTS "Vidya access" ON public.vidya_sessions;
CREATE POLICY "Vidya access" ON public.vidya_sessions
  FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- =====================================================================
-- 12. STORAGE: edujourney-images bucket
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'edujourney-images',
  'edujourney-images',
  true,
  20971520,
  ARRAY['image/png','image/jpeg','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload into sketches/{userId}/...
DROP POLICY IF EXISTS "Authenticated users can upload own sketches" ON storage.objects;
CREATE POLICY "Authenticated users can upload own sketches"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'edujourney-images'
    AND (storage.foldername(name))[1] = 'sketches'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Public read (bucket is already public, belt-and-suspenders)
DROP POLICY IF EXISTS "Public read for edujourney-images" ON storage.objects;
CREATE POLICY "Public read for edujourney-images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'edujourney-images');

-- Allow authenticated users to manage their own objects
DROP POLICY IF EXISTS "Authenticated users can manage own sketches" ON storage.objects;
CREATE POLICY "Authenticated users can manage own sketches"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'edujourney-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'edujourney-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- =====================================================================
-- 13. INDEXES
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_questions_year         ON public.questions(year);
CREATE INDEX IF NOT EXISTS idx_questions_domain       ON public.questions(domain);
CREATE INDEX IF NOT EXISTS idx_questions_pedagogy     ON public.questions(pedagogy);
CREATE INDEX IF NOT EXISTS idx_questions_exam_context ON public.questions(exam_context);
CREATE INDEX IF NOT EXISTS idx_questions_subject      ON public.questions(subject);

CREATE INDEX IF NOT EXISTS idx_flashcards_user_id  ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_cache_key ON public.flashcards(cache_key);
CREATE INDEX IF NOT EXISTS idx_flashcards_scan_id   ON public.flashcards(scan_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_expires   ON public.flashcards(expires_at);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id       ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_topic_resource ON public.quiz_attempts(topic_resource_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at    ON public.quiz_attempts(created_at DESC);

-- =====================================================================
-- 14. PERMISSIONS
-- =====================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- 15. SEED: Official Plans
-- =====================================================================

DELETE FROM public.pricing_plans;

INSERT INTO public.pricing_plans (name, slug, description, price_inr, billing_period, features, limits, sort_order)
VALUES
  ('Free',              'free',           'Try with 5 scans/month',        0,     'monthly', '["5 scans per month", "Topic insights"]'::jsonb,                        '{"scans_per_month": 5}'::jsonb,  0),
  ('KCET+PUC Aspirant', 'kcet-monthly',   'Master Karnataka board',        29900, 'monthly', '["Unlimited scans", "KCET questions"]'::jsonb,                          '{"scans_per_month": -1}'::jsonb, 1),
  ('NEET Achiever',     'neet-monthly',   'Complete prep success',          49900, 'monthly', '["Unlimited scans", "NEET questions"]'::jsonb,                          '{"scans_per_month": -1}'::jsonb, 2),
  ('JEE Champion',      'jee-monthly',    'Conquer JEE confidence',         49900, 'monthly', '["Unlimited scans", "JEE questions"]'::jsonb,                           '{"scans_per_month": -1}'::jsonb, 3),
  ('Ultimate Scholar',  'ultimate-monthly','All inclusive toolkit',         69900, 'monthly', '["KCET+NEET+JEE coverage", "Personalized planner"]'::jsonb,             '{"scans_per_month": -1}'::jsonb, 4)
ON CONFLICT (slug) DO UPDATE SET
  name      = EXCLUDED.name,
  price_inr = EXCLUDED.price_inr,
  features  = EXCLUDED.features;

-- =====================================================================
-- 16. SEED: REI Evolution Configs (initial baselines)
-- =====================================================================

INSERT INTO public.rei_evolution_configs (exam_context, subject, rigor_drift_multiplier, ids_baseline, speed_requirement_weight)
VALUES
  ('KCET', 'Math', 1.8, 0.98, 0.95),
  ('JEE',  'Math', 2.0, 0.99, 0.6)
ON CONFLICT (exam_context, subject) DO NOTHING;

-- =====================================================================
-- 17. ADMIN GRANT
-- =====================================================================

DO $$
DECLARE
  target_email   TEXT := 'prabhubp@gmail.com';
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;
  IF target_user_id IS NOT NULL THEN
    UPDATE public.users    SET role = 'admin'                              WHERE id = target_user_id;
    UPDATE public.profiles SET role = 'admin', subscription_status = 'active' WHERE id = target_user_id;
  END IF;
END $$;

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE  public.flashcards            IS 'Rapid Recall flashcard cache (30-day TTL). Each row holds AI-generated cards for one scan as a JSONB array.';
COMMENT ON COLUMN public.questions.sketch_svg_url IS 'Persisted visual sketch URL. Written by server-supabase.js /api/scan-visuals POST via service_role.';
COMMENT ON TABLE  public.rei_evolution_configs IS 'REI v4.0: per-exam constants for rigor forecasting (replaces hardcoded magic numbers).';
COMMENT ON COLUMN public.exam_historical_patterns.board_signature IS 'Qualitative persona detected by REI (e.g. SYNTHESIZER, LOGICIAN)';
COMMENT ON COLUMN public.exam_historical_patterns.rigor_velocity  IS 'Acceleration of rigor relative to baseline, computed by REI Auditor';
COMMENT ON COLUMN public.exam_historical_patterns.ids_actual       IS 'Measured Item Difficulty Score of the real exam paper';

-- ✅ CLEAN START v7.0 COMPLETE
