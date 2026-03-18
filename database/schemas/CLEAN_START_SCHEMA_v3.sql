-- =====================================================
-- 🚀 UNIVERSAL TEACHER STUDIO - CLEAN START SCHEMA (v3.0)
-- Final, definitive schema with Subscriptions, RBAC, and Unified Identity.
-- =====================================================

-- 1. SETUP EXTENSIONS & ENUMS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1.1 PERMISSIONS SETUP
ALTER SCHEMA public OWNER TO postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- 1.2 DATA TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE sub_status AS ENUM ('active', 'inactive', 'trial');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. CORE IDENTITY TABLES
-- =====================================================

-- Legacy Users table (required by legacy foreign keys)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Profiles table (used for RBAC and app state)
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

-- 3. SUBSCRIPTION & PAYMENT SYSTEM (CRITICAL)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL, -- 'free', 'pro-monthly', 'pro-yearly', 'enterprise'
  description TEXT,
  price_inr INTEGER NOT NULL DEFAULT 0, -- Price in paisa (₹499 = 49900)
  billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly', 'one-time'
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
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  scans_used INTEGER NOT NULL DEFAULT 0,
  scans_limit INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  razorpay_order_id VARCHAR(100) UNIQUE NOT NULL,
  razorpay_payment_id VARCHAR(100) UNIQUE,
  amount INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Plans
INSERT INTO public.pricing_plans (name, slug, description, price_inr, billing_period, features, limits, sort_order)
VALUES
  ('Free', 'free', 'Perfect for trying out EduJourney', 0, 'monthly', '["5 scans per month"]'::jsonb, '{"scans_per_month": 5}'::jsonb, 1),
  ('Pro Monthly', 'pro-monthly', 'For professional teachers', 49900, 'monthly', '["Unlimited scans"]'::jsonb, '{"scans_per_month": -1}'::jsonb, 2)
ON CONFLICT (slug) DO NOTHING;

-- 4. EXAM ANALYSIS & CONTENT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_context TEXT DEFAULT 'KCET',
  status TEXT NOT NULL DEFAULT 'Processing' CHECK (status IN ('Processing', 'Complete', 'Failed')),
  summary TEXT,
  overall_difficulty TEXT CHECK (overall_difficulty IN ('Easy', 'Moderate', 'Hard')),
  analysis_data JSONB,
  year TEXT,
  is_system_scan BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  marks INTEGER NOT NULL DEFAULT 0,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Moderate', 'Hard')),
  topic TEXT NOT NULL,
  options JSONB,
  correct_option_index INTEGER,
  solution_steps JSONB DEFAULT '[]'::jsonb,
  exam_tip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. LEARNING JOURNEY & MASTERY TABLES
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 6. AI GENERATOR & PATTERNS TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.exam_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_context TEXT NOT NULL,
  subject TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  UNIQUE(exam_context, subject)
);

CREATE TABLE IF NOT EXISTS public.exam_historical_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  exam_context TEXT NOT NULL,
  subject TEXT NOT NULL,
  evolution_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(year, exam_context, subject)
);

CREATE TABLE IF NOT EXISTS public.ai_universal_calibration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_type TEXT NOT NULL,
  subject TEXT,
  target_year INTEGER NOT NULL,
  rigor_velocity FLOAT DEFAULT 0.0,
  intent_signature JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. SECURITY & RBAC HELPERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text AS $$
    SELECT role::text FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 8. UNIFIED AUTH TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- 1. Identity tables
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NULL), 'student') ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, email, full_name, role, subscription_status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NULL), 'student', 'active') ON CONFLICT (id) DO NOTHING;

  -- 2. Auto-create Free Subscription
  SELECT id INTO free_plan_id FROM public.pricing_plans WHERE slug = 'free' LIMIT 1;
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_end, scans_limit)
    VALUES (NEW.id, free_plan_id, 'active', NOW() + INTERVAL '100 years', 5) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. RPC & SECURITY POLICIES
-- =====================================================

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles Selection" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.user_role() = 'admin');
CREATE POLICY "Profiles Update" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.user_role() = 'admin');

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subscriptions access" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id OR public.user_role() = 'admin');

-- FINAL PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- CLEAN SETUP v3.0 COMPLETE (Identity + Subscriptions + RBAC)
