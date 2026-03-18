-- =====================================================
-- 🚀 UNIVERSAL TEACHER STUDIO - CLEAN START SCHEMA (v2.0)
-- This file defines the ENTIRE projected state in one clean execution.
-- =====================================================

-- 0. CLEANUP (Optional - only if you want to wipe everything)
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;

-- 1. SETUP EXTENSIONS & ENUMS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE sub_status AS ENUM ('active', 'inactive', 'trial');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1.1 PERMISSIONS SETUP
-- =====================================================
ALTER SCHEMA public OWNER TO postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- 2. CORE IDENTITY TABLES
-- =====================================================

-- Legacy Users table (required by some foreign keys)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Profiles table (used for RBAC and state)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role user_role DEFAULT 'student',
    subscription_status sub_status DEFAULT 'inactive',
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. EXAM ANALYSIS & CONTENT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_context TEXT DEFAULT 'KCET',
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
  year TEXT,
  is_system_scan BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  scan_date TIMESTAMPTZ DEFAULT NOW(),
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
  blooms TEXT,
  options JSONB,
  correct_option_index INTEGER,
  solution_steps JSONB DEFAULT '[]'::jsonb,
  exam_tip TEXT,
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
  sketch_svg_url TEXT,
  source TEXT,
  year INTEGER,
  is_system_question BOOLEAN DEFAULT FALSE,
  question_order INTEGER,
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

-- 4. LEARNING JOURNEY & MASTERY TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('Easy', 'Moderate', 'Hard')),
  estimated_study_hours DECIMAL(4,2),
  exam_weightage JSONB DEFAULT '{}'::jsonb,
  prerequisite_topics UUID[],
  key_concepts JSONB DEFAULT '[]'::jsonb,
  symbol_type TEXT,
  symbol_color TEXT,
  representative_symbol TEXT,
  representative_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject, domain, name)
);

CREATE TABLE IF NOT EXISTS public.topic_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  total_questions INTEGER DEFAULT 0,
  source_scan_ids UUID[],
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  study_stage TEXT DEFAULT 'not_started',
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  average_accuracy DECIMAL(5,2) DEFAULT 0,
  quizzes_taken INTEGER DEFAULT 0,
  average_quiz_score DECIMAL(5,2) DEFAULT 0,
  notes_completed BOOLEAN DEFAULT FALSE,
  last_practiced TIMESTAMPTZ,
  representative_symbol TEXT,
  symbol_type TEXT,
  representative_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic_id, exam_context)
);

CREATE TABLE IF NOT EXISTS public.test_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
  status TEXT DEFAULT 'in_progress',
  questions_attempted INTEGER DEFAULT 0,
  topic_analysis JSONB,
  time_analysis JSONB,
  ai_report JSONB,
  test_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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

-- 5. AI GENERATOR & PATTERNS TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.exam_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_context TEXT NOT NULL, -- 'KCET', 'JEE', 'NEET'
  subject TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  marks_per_question NUMERIC,
  passing_percentage NUMERIC DEFAULT 33,
  negative_marking_enabled BOOLEAN DEFAULT false,
  negative_marking_deduction NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exam_context, subject)
);

CREATE TABLE IF NOT EXISTS public.topic_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id TEXT UNIQUE NOT NULL,
  topic_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  syllabus TEXT,
  blooms_levels TEXT[],
  estimated_difficulty INTEGER,
  prerequisites TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

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
  created_at TIMESTAMP DEFAULT NOW(),
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
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_universal_calibration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_type TEXT NOT NULL,
  subject TEXT,
  topic_id UUID REFERENCES public.topics(id),
  target_year INTEGER NOT NULL,
  rigor_velocity FLOAT DEFAULT 0.0,
  ids_accuracy FLOAT DEFAULT 0.0,
  intent_signature JSONB,
  calibration_directives TEXT[],
  board_signature TEXT DEFAULT 'DEFAULT',
  signature_resonance FLOAT DEFAULT 0.0,
  last_reset_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_calibration_exam_subject_year 
ON public.ai_universal_calibration (exam_type, subject, target_year);

-- 6. CACHE & SESSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.question_banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cache_key TEXT UNIQUE NOT NULL,
  scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cache_key TEXT UNIQUE NOT NULL,
  scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vidya_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PERFORMANCE TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sketch_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sketch_id TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, sketch_id)
);

CREATE TABLE IF NOT EXISTS public.student_performance_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  subject TEXT NOT NULL,
  overall_accuracy INTEGER DEFAULT 50,
  total_tests_taken INTEGER DEFAULT 0,
  topic_performance JSONB DEFAULT '{}',
  weak_areas TEXT[] DEFAULT '{}',
  strong_areas TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exam_context, subject)
);

-- 8. THE UNIFIED AUTH TRIGGER (CRITICAL FIX)
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Legacy Table
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    'student'
  ) ON CONFLICT (id) DO NOTHING;

  -- 2. New Profiles Table
  INSERT INTO public.profiles (id, email, full_name, role, subscription_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    'student',
    'inactive'
  ) ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. PERFORMANCE RPC (Optional but recommended)
-- =====================================================
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. SECURITY (RLS - Minimal required)
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by owner" ON public.profiles FOR SELECT USING (auth.uid() = id);
-- Add more RLS as needed after successful initial login.

-- 11. FINAL PERMISSIONS (Apply to all created objects)
-- =====================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- =====================================================
-- ✅ CLEAN SETUP COMPLETE
-- =====================================================
