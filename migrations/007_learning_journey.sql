-- =====================================================
-- EduJourney Vault - Learning Journey Schema
-- Migration: 007 - Learning Journey & Topic Mastery
-- =====================================================
-- This schema adds:
-- - Topic-based learning organization
-- - Progress tracking and mastery levels
-- - Mock test and quiz system
-- - Performance analytics
-- - Activity tracking
-- =====================================================

-- =====================================================
-- TOPICS MASTER TABLE
-- =====================================================
-- Predefined topics from config/subjects.ts
-- Organized by: Trajectory → Subject → Domain → Topic
-- =====================================================
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('Easy', 'Moderate', 'Hard')),
  estimated_study_hours DECIMAL(4,2),

  -- Exam weightage per trajectory {NEET: 5, JEE: 3, KCET: 4}
  exam_weightage JSONB DEFAULT '{}'::jsonb,

  -- Prerequisites and learning path
  prerequisite_topics UUID[], -- Array of topic IDs that should be learned first
  key_concepts JSONB DEFAULT '[]'::jsonb, -- Array of main concepts

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique topics per subject-domain combination
  UNIQUE(subject, domain, name)
);

-- Indexes for topic queries
CREATE INDEX idx_topics_subject ON topics(subject);
CREATE INDEX idx_topics_domain ON topics(subject, domain);

-- =====================================================
-- TOPIC_RESOURCES TABLE
-- =====================================================
-- User's aggregated resources per topic
-- Combines data from multiple scans for same topic
-- =====================================================
CREATE TABLE topic_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  exam_context TEXT NOT NULL, -- NEET, JEE, KCET, CBSE

  -- Aggregated metadata from multiple scans
  total_questions INTEGER DEFAULT 0,
  source_scan_ids UUID[], -- Array of scan UUIDs that contributed to this topic

  -- Mastery tracking (0-100 scale)
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  study_stage TEXT DEFAULT 'not_started' CHECK (study_stage IN
    ('not_started', 'studying_notes', 'practicing', 'taking_quiz', 'mastered')),

  -- Performance metrics (computed from activities)
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  average_accuracy DECIMAL(5,2) DEFAULT 0,
  quizzes_taken INTEGER DEFAULT 0,
  average_quiz_score DECIMAL(5,2) DEFAULT 0,

  -- Activity timestamps
  last_practiced TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One resource record per user-topic-exam combination
  UNIQUE(user_id, topic_id, exam_context)
);

-- Indexes for resource queries
CREATE INDEX idx_topic_resources_user ON topic_resources(user_id, exam_context);
CREATE INDEX idx_topic_resources_topic ON topic_resources(topic_id);
CREATE INDEX idx_topic_resources_mastery ON topic_resources(user_id, mastery_level DESC);

-- =====================================================
-- TOPIC_ACTIVITIES TABLE
-- =====================================================
-- Tracks all learning activities per topic
-- Used for mastery calculation and analytics
-- =====================================================
CREATE TABLE topic_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_resource_id UUID NOT NULL REFERENCES topic_resources(id) ON DELETE CASCADE,

  -- Activity type
  activity_type TEXT NOT NULL CHECK (activity_type IN
    ('viewed_notes', 'practiced_question', 'completed_quiz', 'reviewed_flashcard')),

  -- Link to specific question (if applicable)
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,

  -- Performance data
  is_correct BOOLEAN,
  time_spent INTEGER, -- seconds

  -- Timestamp and metadata
  activity_timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb -- Additional context
);

-- Indexes for activity queries
CREATE INDEX idx_topic_activities_user ON topic_activities(user_id, topic_resource_id);
CREATE INDEX idx_topic_activities_timestamp ON topic_activities(activity_timestamp DESC);
CREATE INDEX idx_topic_activities_question ON topic_activities(question_id) WHERE question_id IS NOT NULL;

-- =====================================================
-- TEST_ATTEMPTS TABLE
-- =====================================================
-- Stores all test attempts (quizzes and mock tests)
-- =====================================================
CREATE TABLE test_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Test type and context
  test_type TEXT NOT NULL CHECK (test_type IN ('topic_quiz', 'subject_test', 'full_mock')),
  test_name TEXT NOT NULL,
  exam_context TEXT NOT NULL, -- NEET, JEE, KCET, CBSE
  subject TEXT NOT NULL,
  topic_id UUID REFERENCES topics(id), -- NULL for subject/full tests

  -- Test configuration
  total_questions INTEGER,
  duration_minutes INTEGER,

  -- Timing data
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  total_duration INTEGER, -- actual time taken in seconds

  -- Scoring
  raw_score INTEGER, -- correct answers count
  percentage DECIMAL(5,2),
  marks_obtained DECIMAL(6,2),
  marks_total DECIMAL(6,2),
  negative_marks DECIMAL(6,2) DEFAULT 0,

  -- Progress status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  questions_attempted INTEGER DEFAULT 0,

  -- Post-completion analysis (computed after submission)
  topic_analysis JSONB, -- Per-topic performance breakdown
  time_analysis JSONB, -- Time management insights
  ai_report JSONB, -- AI-generated performance report

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for test queries
CREATE INDEX idx_test_attempts_user ON test_attempts(user_id, created_at DESC);
CREATE INDEX idx_test_attempts_status ON test_attempts(user_id, status);
CREATE INDEX idx_test_attempts_type ON test_attempts(test_type, exam_context);
CREATE INDEX idx_test_attempts_topic ON test_attempts(topic_id) WHERE topic_id IS NOT NULL;

-- =====================================================
-- TEST_RESPONSES TABLE
-- =====================================================
-- Individual question responses within a test attempt
-- =====================================================
CREATE TABLE test_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),

  -- Response data
  selected_option INTEGER, -- 0-3 for MCQs, NULL if unanswered
  is_correct BOOLEAN,
  time_spent INTEGER, -- seconds spent on this question
  marked_for_review BOOLEAN DEFAULT FALSE,

  -- Question metadata (denormalized for analytics)
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  marks DECIMAL(4,2) DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one response per question per attempt
  UNIQUE(attempt_id, question_id)
);

-- Indexes for response queries
CREATE INDEX idx_test_responses_attempt ON test_responses(attempt_id);
CREATE INDEX idx_test_responses_question ON test_responses(question_id);
CREATE INDEX idx_test_responses_correctness ON test_responses(attempt_id, is_correct);

-- =====================================================
-- SUBJECT_PROGRESS TABLE
-- =====================================================
-- Aggregated progress per subject per trajectory
-- Computed from topic_resources
-- =====================================================
CREATE TABLE subject_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trajectory_id TEXT NOT NULL, -- NEET, JEE, KCET, CBSE
  subject TEXT NOT NULL,

  -- Overall mastery (weighted average of topics)
  overall_mastery INTEGER DEFAULT 0,
  topics_total INTEGER DEFAULT 0,
  topics_mastered INTEGER DEFAULT 0, -- mastery >= 85%

  -- Aggregated performance
  total_questions_attempted INTEGER DEFAULT 0,
  overall_accuracy DECIMAL(5,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One progress record per user-trajectory-subject
  UNIQUE(user_id, trajectory_id, subject)
);

-- Indexes for subject progress queries
CREATE INDEX idx_subject_progress_user ON subject_progress(user_id, trajectory_id);
CREATE INDEX idx_subject_progress_mastery ON subject_progress(user_id, overall_mastery DESC);

-- =====================================================
-- TOPIC_QUESTION_MAPPING TABLE
-- =====================================================
-- Maps existing questions to topics
-- Enables topic-based question filtering
-- =====================================================
CREATE TABLE topic_question_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,

  -- Mapping confidence (AI-generated mappings may have confidence < 1.0)
  confidence DECIMAL(3,2) DEFAULT 1.0,
  mapped_by TEXT DEFAULT 'ai', -- 'ai' or 'manual'

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each question can belong to multiple topics
  UNIQUE(topic_id, question_id)
);

-- Indexes for question-topic mapping
CREATE INDEX idx_topic_question_mapping_topic ON topic_question_mapping(topic_id);
CREATE INDEX idx_topic_question_mapping_question ON topic_question_mapping(question_id);
CREATE INDEX idx_topic_question_mapping_confidence ON topic_question_mapping(confidence DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp for topic_resources
CREATE TRIGGER update_topic_resources_updated_at BEFORE UPDATE ON topic_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at timestamp for subject_progress
CREATE TRIGGER update_subject_progress_updated_at BEFORE UPDATE ON subject_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Calculate topic mastery based on activities
CREATE OR REPLACE FUNCTION calculate_topic_mastery(
  p_topic_resource_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_mastery INTEGER;
  v_accuracy DECIMAL;
  v_quiz_count INTEGER;
  v_practice_count INTEGER;
BEGIN
  -- Get activity metrics
  SELECT
    COALESCE(AVG(CASE WHEN is_correct THEN 100 ELSE 0 END), 0),
    COUNT(CASE WHEN activity_type = 'completed_quiz' THEN 1 END),
    COUNT(CASE WHEN activity_type = 'practiced_question' THEN 1 END)
  INTO v_accuracy, v_quiz_count, v_practice_count
  FROM topic_activities
  WHERE topic_resource_id = p_topic_resource_id
    AND is_correct IS NOT NULL;

  -- Mastery formula:
  -- Base: accuracy (0-100)
  -- Bonus: +10 for each quiz completed (max 20)
  -- Bonus: +5 for every 10 questions practiced (max 15)
  v_mastery := LEAST(100,
    v_accuracy * 0.65 +
    LEAST(20, v_quiz_count * 10) +
    LEAST(15, (v_practice_count / 10) * 5)
  );

  RETURN v_mastery;
END;
$$ LANGUAGE plpgsql;

-- Update subject progress when topic mastery changes
CREATE OR REPLACE FUNCTION update_subject_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate subject progress for affected user-trajectory-subject
  INSERT INTO subject_progress (
    user_id,
    trajectory_id,
    subject,
    overall_mastery,
    topics_total,
    topics_mastered,
    total_questions_attempted,
    overall_accuracy
  )
  SELECT
    NEW.user_id,
    NEW.exam_context,
    NEW.subject,
    ROUND(AVG(mastery_level))::INTEGER,
    COUNT(*),
    COUNT(CASE WHEN mastery_level >= 85 THEN 1 END),
    SUM(questions_attempted),
    ROUND(AVG(average_accuracy), 2)
  FROM topic_resources
  WHERE user_id = NEW.user_id
    AND exam_context = NEW.exam_context
    AND subject = NEW.subject
  GROUP BY user_id, exam_context, subject
  ON CONFLICT (user_id, trajectory_id, subject)
  DO UPDATE SET
    overall_mastery = EXCLUDED.overall_mastery,
    topics_total = EXCLUDED.topics_total,
    topics_mastered = EXCLUDED.topics_mastered,
    total_questions_attempted = EXCLUDED.total_questions_attempted,
    overall_accuracy = EXCLUDED.overall_accuracy,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update subject progress when topic mastery changes
CREATE TRIGGER trigger_update_subject_progress
  AFTER INSERT OR UPDATE OF mastery_level ON topic_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_subject_progress();

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- View for user's topic dashboard (all topics with progress)
CREATE VIEW topic_dashboard AS
SELECT
  t.id AS topic_id,
  t.name AS topic_name,
  t.subject,
  t.domain,
  t.difficulty_level,
  tr.user_id,
  tr.exam_context,
  COALESCE(tr.mastery_level, 0) AS mastery_level,
  COALESCE(tr.study_stage, 'not_started') AS study_stage,
  COALESCE(tr.total_questions, 0) AS total_questions,
  COALESCE(tr.questions_attempted, 0) AS questions_attempted,
  COALESCE(tr.average_accuracy, 0) AS average_accuracy,
  tr.last_practiced,
  t.exam_weightage
FROM topics t
LEFT JOIN topic_resources tr ON tr.topic_id = t.id;

-- View for test performance summary
CREATE VIEW test_performance_summary AS
SELECT
  ta.id AS attempt_id,
  ta.user_id,
  ta.test_type,
  ta.test_name,
  ta.exam_context,
  ta.subject,
  ta.percentage,
  ta.marks_obtained,
  ta.marks_total,
  ta.total_duration,
  ta.created_at,
  ta.status,
  COUNT(tr.id) AS total_responses,
  COUNT(CASE WHEN tr.is_correct THEN 1 END) AS correct_responses,
  ROUND(AVG(tr.time_spent), 2) AS avg_time_per_question
FROM test_attempts ta
LEFT JOIN test_responses tr ON tr.attempt_id = ta.id
GROUP BY ta.id;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE topics IS 'Master list of all topics organized by subject and domain';
COMMENT ON TABLE topic_resources IS 'User progress and aggregated resources per topic';
COMMENT ON TABLE topic_activities IS 'Learning activity tracking for mastery calculation';
COMMENT ON TABLE test_attempts IS 'Quiz and mock test attempt records';
COMMENT ON TABLE test_responses IS 'Individual question responses within test attempts';
COMMENT ON TABLE subject_progress IS 'Aggregated subject-level progress metrics';
COMMENT ON TABLE topic_question_mapping IS 'Maps existing questions to topics';

COMMENT ON FUNCTION calculate_topic_mastery(UUID) IS 'Calculate mastery score (0-100) based on activities';
COMMENT ON FUNCTION update_subject_progress() IS 'Auto-update subject progress when topic mastery changes';

-- =====================================================
-- END OF LEARNING JOURNEY SCHEMA
-- =====================================================
