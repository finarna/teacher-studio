-- ============================================================================
-- Migration: Practice Lab Persistence (Phase 2)
-- Description: Add tables for saving answers, bookmarks, and time tracking
-- All tables are user-scoped for multi-user support
-- ============================================================================

-- ============================================================================
-- TABLE: practice_answers
-- Stores user's answer selections for questions (persists across sessions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS practice_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  topic_resource_id UUID REFERENCES topic_resources(id) ON DELETE CASCADE,

  -- Answer data
  selected_option INTEGER, -- 0, 1, 2, 3 for MCQ options A, B, C, D
  is_correct BOOLEAN,
  time_spent_seconds INTEGER DEFAULT 0, -- Time spent on this question

  -- Attempt tracking
  attempt_count INTEGER DEFAULT 1,
  first_attempt_correct BOOLEAN,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: One answer per user per question (can update)
  UNIQUE(user_id, question_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_practice_answers_user_id ON practice_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_question_id ON practice_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_topic_resource_id ON practice_answers(topic_resource_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_user_topic ON practice_answers(user_id, topic_resource_id);

COMMENT ON TABLE practice_answers IS 'User answer selections for practice questions (persistent across sessions)';
COMMENT ON COLUMN practice_answers.selected_option IS 'MCQ option index: 0=A, 1=B, 2=C, 3=D';
COMMENT ON COLUMN practice_answers.time_spent_seconds IS 'Time spent answering this question in seconds';
COMMENT ON COLUMN practice_answers.first_attempt_correct IS 'Whether first attempt was correct (for mastery calculation)';


-- ============================================================================
-- TABLE: bookmarked_questions
-- Stores user's bookmarked questions for later review
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookmarked_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  topic_resource_id UUID REFERENCES topic_resources(id) ON DELETE SET NULL,

  -- Metadata
  subject TEXT NOT NULL CHECK (subject IN ('Physics', 'Chemistry', 'Math', 'Biology')),
  exam_context TEXT NOT NULL CHECK (exam_context IN ('NEET', 'JEE', 'KCET', 'CBSE')),
  notes TEXT, -- User's personal notes on this question

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: One bookmark per user per question
  UNIQUE(user_id, question_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_bookmarked_questions_user_id ON bookmarked_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarked_questions_question_id ON bookmarked_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_bookmarked_questions_user_subject ON bookmarked_questions(user_id, subject, exam_context);

COMMENT ON TABLE bookmarked_questions IS 'User bookmarks for important questions (persistent across sessions)';
COMMENT ON COLUMN bookmarked_questions.notes IS 'User personal notes about this question';


-- ============================================================================
-- TABLE: practice_sessions
-- Track practice session metadata for analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_resource_id UUID REFERENCES topic_resources(id) ON DELETE CASCADE,

  -- Session metadata
  subject TEXT NOT NULL CHECK (subject IN ('Physics', 'Chemistry', 'Math', 'Biology')),
  exam_context TEXT NOT NULL CHECK (exam_context IN ('NEET', 'JEE', 'KCET', 'CBSE')),
  topic_name TEXT NOT NULL,

  -- Session stats
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),

  -- Session state
  is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_topic ON practice_sessions(user_id, topic_resource_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_active ON practice_sessions(user_id, is_active) WHERE is_active = true;

COMMENT ON TABLE practice_sessions IS 'Practice session tracking for analytics and progress monitoring';


-- ============================================================================
-- TRIGGER: Update updated_at timestamp on practice_answers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_practice_answers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER practice_answers_updated_at
  BEFORE UPDATE ON practice_answers
  FOR EACH ROW
  EXECUTE FUNCTION update_practice_answers_timestamp();


-- ============================================================================
-- FUNCTION: Get user practice statistics for a topic
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_topic_practice_stats(
  p_user_id UUID,
  p_topic_resource_id UUID
)
RETURNS TABLE (
  total_attempted INTEGER,
  total_correct INTEGER,
  accuracy_percentage NUMERIC,
  total_time_seconds INTEGER,
  avg_time_per_question NUMERIC,
  first_attempt_accuracy NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_attempted,
    COUNT(*) FILTER (WHERE is_correct = true)::INTEGER AS total_correct,
    ROUND(
      (COUNT(*) FILTER (WHERE is_correct = true)::NUMERIC /
       NULLIF(COUNT(*)::NUMERIC, 0) * 100),
      1
    ) AS accuracy_percentage,
    COALESCE(SUM(time_spent_seconds), 0)::INTEGER AS total_time_seconds,
    ROUND(
      COALESCE(SUM(time_spent_seconds), 0)::NUMERIC /
      NULLIF(COUNT(*)::NUMERIC, 0),
      1
    ) AS avg_time_per_question,
    ROUND(
      (COUNT(*) FILTER (WHERE first_attempt_correct = true)::NUMERIC /
       NULLIF(COUNT(*)::NUMERIC, 0) * 100),
      1
    ) AS first_attempt_accuracy
  FROM practice_answers
  WHERE user_id = p_user_id
    AND topic_resource_id = p_topic_resource_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_topic_practice_stats IS 'Get comprehensive practice statistics for a user on a specific topic';


-- ============================================================================
-- RLS (Row Level Security) Policies
-- Ensure users can only access their own data
-- ============================================================================

-- Enable RLS
ALTER TABLE practice_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarked_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

-- practice_answers policies
CREATE POLICY "Users can view own practice answers"
  ON practice_answers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice answers"
  ON practice_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own practice answers"
  ON practice_answers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own practice answers"
  ON practice_answers FOR DELETE
  USING (auth.uid() = user_id);

-- bookmarked_questions policies
CREATE POLICY "Users can view own bookmarks"
  ON bookmarked_questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
  ON bookmarked_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks"
  ON bookmarked_questions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON bookmarked_questions FOR DELETE
  USING (auth.uid() = user_id);

-- practice_sessions policies
CREATE POLICY "Users can view own practice sessions"
  ON practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice sessions"
  ON practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own practice sessions"
  ON practice_sessions FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================================================
-- Sample Queries (for testing)
-- ============================================================================

-- Get all answers for a user in a topic
-- SELECT * FROM practice_answers
-- WHERE user_id = 'user-uuid' AND topic_resource_id = 'topic-uuid';

-- Get user's bookmarked questions
-- SELECT bq.*, q.text, q.topic
-- FROM bookmarked_questions bq
-- JOIN questions q ON bq.question_id = q.id
-- WHERE bq.user_id = 'user-uuid';

-- Get practice stats for a topic
-- SELECT * FROM get_user_topic_practice_stats('user-uuid', 'topic-uuid');
