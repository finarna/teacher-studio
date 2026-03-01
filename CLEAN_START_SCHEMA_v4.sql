-- =====================================================
-- EDUJOURNEY CLEAN_START_SCHEMA v4.1 (Definitive Universal Version)
-- Supports: Identity, Payments (Razorpay), AI Content, Scans, RLS, & Idempotency
-- =====================================================

-- 0. INITIAL SETUP
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TYPES & ENUMS (Optional, but using VARCHAR for status is safer for compatibility)
-- =====================================================
-- Drop existing types if they exist to start fresh
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.sub_status CASCADE;

-- 2. IDENTITY TABLES
-- =====================================================

-- Legacy Users table (referenced by old modules)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role VARCHAR(20) DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extended Profiles (App usage)
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

-- 3. SUBSCRIPTION & PAYMENT TABLES (Razorpay Compatible)
-- =====================================================

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
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'pending', 'cancelled', 'expired'
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
  email VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  template_data JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SCAN & CONTENT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Processing',
  summary TEXT,
  overall_difficulty TEXT,
  analysis_data JSONB,
  difficulty_distribution JSONB,
  blooms_taxonomy JSONB,
  topic_weightage JSONB,
  trends JSONB,
  predictive_topics JSONB,
  faq JSONB,
  strategy JSONB,
  scan_date TIMESTAMPTZ DEFAULT NOW(),
  exam_context TEXT DEFAULT 'KCET',
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
  difficulty TEXT,
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
  difficulty TEXT,
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
  visual_element_position TEXT,
  visual_bounding_box JSONB,
  diagram_url TEXT,
  sketch_svg_url TEXT,
  source TEXT,
  year INTEGER,
  question_order INTEGER,
  is_system_question BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
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

-- 5. LEARNING JOURNEY & MASTERY TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    units TEXT[], 
    description TEXT,
    icon_url TEXT,
    mastery_criteria JSONB,
    estimated_study_hours INTEGER,
    exam_weightage FLOAT,
    prerequisite_topics UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.topic_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content_url TEXT,
    content_data JSONB,
    proficiency_score FLOAT DEFAULT 0,
    times_practiced INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score FLOAT,
    total_questions INTEGER,
    incorrect_topics TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AI & SYSTEM TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.exam_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_name TEXT NOT NULL, -- e.g., 'KCET', 'NEET'
    subject TEXT NOT NULL,
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_universal_calibration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calibration_key TEXT UNIQUE NOT NULL, -- e.g., 'KCET_BIOLOGY_2026'
    system_prompt TEXT,
    parameters JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cache_key TEXT UNIQUE NOT NULL,
    scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE TABLE IF NOT EXISTS public.vidya_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    context_type TEXT,
    context_id UUID,
    messages JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. HELPERS & TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Identity tables
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NULL), 'student') 
  ON CONFLICT (id) DO NOTHING;

  -- 2. Profiles with 'inactive' status (Forces the Plan Wall)
  INSERT INTO public.profiles (id, email, full_name, role, subscription_status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NULL), 'student', 'inactive') 
  ON CONFLICT (id) DO UPDATE SET subscription_status = EXCLUDED.subscription_status;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. ROW LEVEL SECURITY (RLS) - FOR EVERY TABLE
-- =====================================================

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- 8.1 IDENTITY & PROFILES
DROP POLICY IF EXISTS "Users view own data" ON public.users;
CREATE POLICY "Users view own data" ON public.users FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles view" ON public.profiles;
CREATE POLICY "Profiles view" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles update" ON public.profiles;
CREATE POLICY "Profiles update" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- 8.2 SUBSCRIPTIONS & PAYMENTS
DROP POLICY IF EXISTS "Public view plans" ON public.pricing_plans;
CREATE POLICY "Public view plans" ON public.pricing_plans FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users view own sub" ON public.subscriptions;
CREATE POLICY "Users view own sub" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users view own payments" ON public.payments;
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users create payments" ON public.payments;
CREATE POLICY "Users create payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8.3 SCANS & CONTENT
DROP POLICY IF EXISTS "Users view own scans" ON public.scans;
CREATE POLICY "Users view own scans" ON public.scans FOR SELECT USING (auth.uid() = user_id OR public.is_admin() OR is_system_scan = true);

DROP POLICY IF EXISTS "Users conduct scans" ON public.scans;
CREATE POLICY "Users conduct scans" ON public.scans FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view questions" ON public.questions;
CREATE POLICY "Users view questions" ON public.questions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.scans s WHERE s.id = scan_id AND (s.user_id = auth.uid() OR s.is_system_scan = true))
    OR public.is_admin()
);

-- 8.4 LEARNING JOURNEY
DROP POLICY IF EXISTS "Public view topics" ON public.topics;
CREATE POLICY "Public view topics" ON public.topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage resources" ON public.topic_resources;
CREATE POLICY "Users manage resources" ON public.topic_resources FOR ALL USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users view performance" ON public.student_performance_profiles;
CREATE POLICY "Users view performance" ON public.student_performance_profiles FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- 8.5 CACHE & TOOLS
DROP POLICY IF EXISTS "Users manage cache" ON public.question_banks;
CREATE POLICY "Users manage cache" ON public.question_banks FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage chat" ON public.vidya_sessions;
CREATE POLICY "Users manage chat" ON public.vidya_sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Only service role webhooks" ON public.webhook_events;
CREATE POLICY "Only service role webhooks" ON public.webhook_events FOR ALL USING (auth.role() = 'service_role');

-- 9. FINAL SEEDING (Pricing Plans)
-- =====================================================

INSERT INTO public.pricing_plans (name, slug, description, price_inr, billing_period, features, limits, sort_order)
VALUES
  ('Free', 'free', 'Try out with 5 scans per month', 0, 'monthly', '["5 scans per month", "Topic insights", "Performance analytics"]'::jsonb, '{"scans_per_month": 5}'::jsonb, 0),
  ('KCET+PUC Aspirant', 'kcet-monthly', 'Master Karnataka board and KCET exams', 29900, 'monthly', '["Unlimited scans", "KCET question bank", "PUC syllabus coverage", "Mock tests"]'::jsonb, '{"scans_per_month": -1}'::jsonb, 1),
  ('KCET+PUC Aspirant (Yearly)', 'kcet-yearly', 'Annual preparation journey', 299000, 'yearly', '["Everything in monthly", "2 months free", "Priority updates"]'::jsonb, '{"scans_per_month": -1}'::jsonb, 2),
  ('NEET Achiever', 'neet-monthly', 'Complete prep for medical entrance success', 49900, 'monthly', '["Unlimited scans", "15,000+ NEET questions", "NCERT-focused analysis", "Chapter-wise analytics"]'::jsonb, '{"scans_per_month": -1}'::jsonb, 3),
  ('NEET Achiever (Yearly)', 'neet-yearly', 'Full year medical prep', 499000, 'yearly', '["Everything in monthly", "Personal mentor", "Offline access"]'::jsonb, '{"scans_per_month": -1}'::jsonb, 4),
  ('JEE Champion', 'jee-monthly', 'Conquer JEE Main & Advanced with confidence', 49900, 'monthly', '["Unlimited scans", "20,000+ JEE questions", "Formula quick reference", "IIT-level problem sets"]'::jsonb, '{"scans_per_month": -1}'::jsonb, 5),
  ('JEE Champion (Yearly)', 'jee-yearly', 'Full year of engineering prep', 499000, 'yearly', '["Everything in monthly", "Doubt sessions", "Advanced analytics"]'::jsonb, '{"scans_per_month": -1}'::jsonb, 6),
  ('Ultimate Scholar', 'ultimate-monthly', 'Master all competitive exams - All inclusive', 69900, 'monthly', '["KCET + NEET + JEE coverage", "50,000+ questions", "Personalized study planner", "1-on-1 support"]'::jsonb, '{"scans_per_month": -1}'::jsonb, 7),
  ('Ultimate Scholar (Yearly)', 'ultimate-yearly', 'The complete annual education toolkit', 699000, 'yearly', '["Everything in Ultimate Monthly", "Premium features", "Priority access"]'::jsonb, '{"scans_per_month": -1}'::jsonb, 8),
  ('For Schools', 'enterprise', 'For institutions and educational centers', 0, 'monthly', '["Unlimited team members", "Custom integrations", "Dedicated account manager", "SLA guarantee"]'::jsonb, '{"scans_per_month": -1}'::jsonb, 9)
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_inr = EXCLUDED.price_inr,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  sort_order = EXCLUDED.sort_order;

-- 10. GRANTS
-- =====================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 11. REFRESH SCHEMA
-- =====================================================
NOTIFY pgrst, 'reload schema';

-- 12. ADMIN GRANT (Replace with your email)
-- =====================================================
DO $$
DECLARE
    target_email TEXT := 'prabhubp@gmail.com'; 
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;
    IF target_user_id IS NOT NULL THEN
        UPDATE public.users SET role = 'admin' WHERE id = target_user_id;
        UPDATE public.profiles SET role = 'admin', subscription_status = 'active' WHERE id = target_user_id;
        RAISE NOTICE '✅ Admin status granted to %', target_email;
    END IF;
END $$;
