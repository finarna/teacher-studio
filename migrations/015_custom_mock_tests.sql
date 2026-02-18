-- Migration 015: Custom Mock Tests
-- Add support for custom mock test builder with templates

-- ==============================================
-- Update test_attempts to support custom_mock
-- ==============================================

-- Drop existing constraint
ALTER TABLE test_attempts
DROP CONSTRAINT IF EXISTS test_attempts_test_type_check;

-- Add new constraint with custom_mock
ALTER TABLE test_attempts
ADD CONSTRAINT test_attempts_test_type_check
CHECK (test_type IN ('topic_quiz', 'subject_test', 'full_mock', 'custom_mock'));

-- Add test configuration storage
ALTER TABLE test_attempts
ADD COLUMN IF NOT EXISTS test_config JSONB;

COMMENT ON COLUMN test_attempts.test_config IS
'Stores custom test configuration: topicIds, difficultyMix, questionCount, durationMinutes, etc.';

-- ==============================================
-- Create test_templates table
-- ==============================================

CREATE TABLE IF NOT EXISTS test_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  topic_ids UUID[] NOT NULL,
  difficulty_mix JSONB NOT NULL,
  question_count INTEGER NOT NULL CHECK (question_count BETWEEN 10 AND 100),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 10 AND 180),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

COMMENT ON TABLE test_templates IS 'Saved test configurations for reuse in custom mock test builder';

-- ==============================================
-- Indexes for performance
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_test_templates_user
ON test_templates(user_id, subject, exam_context);

CREATE INDEX IF NOT EXISTS idx_test_templates_last_used
ON test_templates(last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_attempts_test_type
ON test_attempts(test_type, user_id);

-- ==============================================
-- Row Level Security (RLS) Policies
-- ==============================================

ALTER TABLE test_templates ENABLE ROW LEVEL SECURITY;

-- Users can only see their own templates
CREATE POLICY test_templates_select ON test_templates
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own templates
CREATE POLICY test_templates_insert ON test_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own templates
CREATE POLICY test_templates_update ON test_templates
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own templates
CREATE POLICY test_templates_delete ON test_templates
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- Validation
-- ==============================================

-- Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'test_templates'
  ) THEN
    RAISE EXCEPTION 'test_templates table was not created';
  END IF;

  RAISE NOTICE '✅ Migration 015: Custom mock tests migration completed successfully';
END $$;
