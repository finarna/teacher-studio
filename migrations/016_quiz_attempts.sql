-- ============================================================================
-- Migration: Quiz Attempts Tracking
-- Description: Store completed quiz attempts for history and review
-- ============================================================================

-- ============================================================================
-- TABLE: quiz_attempts
-- Stores completed quiz attempts with results
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_resource_id UUID NOT NULL REFERENCES topic_resources(id) ON DELETE CASCADE,

  -- Quiz metadata
  subject TEXT NOT NULL CHECK (subject IN ('Physics', 'Chemistry', 'Math', 'Biology')),
  exam_context TEXT NOT NULL CHECK (exam_context IN ('NEET', 'JEE', 'KCET', 'CBSE')),
  topic_name TEXT NOT NULL,

  -- Quiz configuration
  question_count INTEGER NOT NULL,
  questions_data JSONB NOT NULL, -- Array of questions with user answers

  -- Results
  correct_count INTEGER NOT NULL,
  wrong_count INTEGER NOT NULL,
  accuracy_percentage INTEGER NOT NULL,
  time_spent_seconds INTEGER NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_topic_resource ON quiz_attempts(topic_resource_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_topic ON quiz_attempts(user_id, topic_resource_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON quiz_attempts(created_at DESC);

COMMENT ON TABLE quiz_attempts IS 'Completed quiz attempts for review and history tracking';
COMMENT ON COLUMN quiz_attempts.questions_data IS 'JSONB array containing questions, options, correct answers, and user selections';


-- ============================================================================
-- RLS (Row Level Security) Policies
-- ============================================================================

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz attempts"
  ON quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quiz attempts"
  ON quiz_attempts FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- FUNCTION: Get recent quiz attempts for a topic
-- ============================================================================
CREATE OR REPLACE FUNCTION get_recent_quiz_attempts(
  p_user_id UUID,
  p_topic_resource_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  accuracy_percentage INTEGER,
  question_count INTEGER,
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    qa.id,
    qa.accuracy_percentage,
    qa.question_count,
    qa.time_spent_seconds,
    qa.created_at
  FROM quiz_attempts qa
  WHERE qa.user_id = p_user_id
    AND qa.topic_resource_id = p_topic_resource_id
  ORDER BY qa.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_recent_quiz_attempts IS 'Get recent quiz attempts for a user on a specific topic';
