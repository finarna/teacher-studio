-- ==================================================
-- AI Trends & Predictive Analysis Tables
-- ==================================================

-- 1. Historical exam patterns table
CREATE TABLE IF NOT EXISTS exam_historical_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  exam_context TEXT NOT NULL,
  subject TEXT NOT NULL,
  total_marks INTEGER NOT NULL,
  difficulty_easy_pct INTEGER,
  difficulty_moderate_pct INTEGER,
  difficulty_hard_pct INTEGER,
  evolution_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year, exam_context, subject)
);

-- 2. Topic distribution in historical exams
CREATE TABLE IF NOT EXISTS exam_topic_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  historical_pattern_id UUID REFERENCES exam_historical_patterns(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  average_marks NUMERIC,
  difficulty_easy_count INTEGER DEFAULT 0,
  difficulty_moderate_count INTEGER DEFAULT 0,
  difficulty_hard_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Topic metadata table for AI generation
CREATE TABLE IF NOT EXISTS topic_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id TEXT UNIQUE NOT NULL,
  topic_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  syllabus TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS Policies for these tables
ALTER TABLE exam_historical_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_topic_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_metadata ENABLE ROW LEVEL SECURITY;

-- Everyone can read trends
CREATE POLICY IF NOT EXISTS "Trends are viewable by everyone" ON exam_historical_patterns
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Distributions are viewable by everyone" ON exam_topic_distributions
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Metadata is viewable by everyone" ON topic_metadata
  FOR SELECT USING (true);

-- Only service role can manage (Admin via server)
-- Note: supabaseAdmin uses service_role key which bypasses RLS
