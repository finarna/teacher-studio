-- Migration: Create student_performance_profiles table for AI question generation
-- This table tracks student performance across topics to enable personalized AI-generated tests

CREATE TABLE IF NOT EXISTS student_performance_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  subject TEXT NOT NULL,
  overall_accuracy INTEGER DEFAULT 50, -- Overall accuracy percentage (0-100)
  total_tests_taken INTEGER DEFAULT 0,
  topic_performance JSONB DEFAULT '{}', -- { "topic_id": { "accuracy": 75, "questions_attempted": 20, "questions_correct": 15, "last_updated": "2024-01-15" } }
  weak_areas TEXT[] DEFAULT '{}', -- Array of topic IDs where accuracy < 60%
  strong_areas TEXT[] DEFAULT '{}', -- Array of topic IDs where accuracy >= 80%
  last_test_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one profile per user/exam/subject combination
  UNIQUE(user_id, exam_context, subject)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_performance_user
  ON student_performance_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_student_performance_exam
  ON student_performance_profiles(exam_context, subject);

-- Add table comment
COMMENT ON TABLE student_performance_profiles IS 'Tracks individual student performance across topics for personalized AI question generation. Updated automatically after each test completion.';

-- Row Level Security (RLS) policies
ALTER TABLE student_performance_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own performance profiles
CREATE POLICY "Users can view own performance profiles"
  ON student_performance_profiles
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Policy: Service role can insert/update performance profiles
CREATE POLICY "Service role can manage performance profiles"
  ON student_performance_profiles
  FOR ALL
  USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON student_performance_profiles TO authenticated;
GRANT ALL ON student_performance_profiles TO service_role;
