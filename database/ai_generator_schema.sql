-- ==================================================
-- AI Question Generator - Database Schema
-- All exam data is stored here, NO hardcoding
-- ==================================================

-- Exam configurations table
CREATE TABLE IF NOT EXISTS exam_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_context TEXT NOT NULL, -- 'KCET', 'JEE', 'NEET', 'CBSE'
  subject TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  marks_per_question NUMERIC, -- NULL means variable
  passing_percentage NUMERIC NOT NULL DEFAULT 33,
  negative_marking_enabled BOOLEAN DEFAULT false,
  negative_marking_deduction NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exam_context, subject)
);

-- Topic metadata table
CREATE TABLE IF NOT EXISTS topic_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id TEXT UNIQUE NOT NULL,
  topic_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  syllabus TEXT, -- Detailed syllabus content
  blooms_levels TEXT[], -- ['Remember', 'Understand', 'Apply', ...]
  estimated_difficulty INTEGER CHECK (estimated_difficulty BETWEEN 1 AND 10),
  prerequisites TEXT[], -- Array of topic_ids
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Historical exam patterns table
CREATE TABLE IF NOT EXISTS exam_historical_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  exam_context TEXT NOT NULL,
  subject TEXT NOT NULL,
  total_marks INTEGER NOT NULL,
  difficulty_easy_pct INTEGER, -- Percentage of easy questions
  difficulty_moderate_pct INTEGER,
  difficulty_hard_pct INTEGER,
  paper_analysis_url TEXT, -- Link to detailed analysis
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(year, exam_context, subject)
);

-- Topic distribution in historical exams
CREATE TABLE IF NOT EXISTS exam_topic_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  historical_pattern_id UUID REFERENCES exam_historical_patterns(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  average_marks NUMERIC,
  difficulty_easy_count INTEGER DEFAULT 0,
  difficulty_moderate_count INTEGER DEFAULT 0,
  difficulty_hard_count INTEGER DEFAULT 0,
  notes TEXT, -- Any special observations
  created_at TIMESTAMP DEFAULT NOW()
);

-- Generation rules configuration
CREATE TABLE IF NOT EXISTS generation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_context TEXT NOT NULL,
  subject TEXT,
  weight_predicted_pattern NUMERIC DEFAULT 0.4 CHECK (weight_predicted_pattern BETWEEN 0 AND 1),
  weight_student_weak_areas NUMERIC DEFAULT 0.3 CHECK (weight_student_weak_areas BETWEEN 0 AND 1),
  weight_curriculum_balance NUMERIC DEFAULT 0.2 CHECK (weight_curriculum_balance BETWEEN 0 AND 1),
  weight_recent_trends NUMERIC DEFAULT 0.1 CHECK (weight_recent_trends BETWEEN 0 AND 1),
  adaptive_difficulty_enabled BOOLEAN DEFAULT true,
  adaptive_baseline_accuracy NUMERIC DEFAULT 60,
  adaptive_step_size NUMERIC DEFAULT 0.1,
  avoid_recent_questions BOOLEAN DEFAULT true,
  days_since_last_attempt INTEGER DEFAULT 30,
  max_repetition_allowed INTEGER DEFAULT 2,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exam_context, subject)
);

-- Indexes for performance
CREATE INDEX idx_topic_metadata_subject_exam ON topic_metadata(subject, exam_context);
CREATE INDEX idx_exam_patterns_year_exam ON exam_historical_patterns(year, exam_context, subject);
CREATE INDEX idx_topic_distributions_pattern ON exam_topic_distributions(historical_pattern_id);
CREATE INDEX idx_topic_distributions_topic ON exam_topic_distributions(topic_id);

-- ==================================================
-- SAMPLE DATA - Insert default configurations
-- ==================================================

-- KCET Math Configuration
INSERT INTO exam_configurations (exam_context, subject, total_questions, duration_minutes, marks_per_question, passing_percentage, negative_marking_enabled)
VALUES ('KCET', 'Math', 60, 80, 1, 33, false)
ON CONFLICT (exam_context, subject) DO NOTHING;

-- JEE Mains Math Configuration
INSERT INTO exam_configurations (exam_context, subject, total_questions, duration_minutes, marks_per_question, passing_percentage, negative_marking_enabled, negative_marking_deduction)
VALUES ('JEE', 'Math', 30, 180, 4, 33, true, -1)
ON CONFLICT (exam_context, subject) DO NOTHING;

-- NEET Physics Configuration
INSERT INTO exam_configurations (exam_context, subject, total_questions, duration_minutes, marks_per_question, passing_percentage, negative_marking_enabled, negative_marking_deduction)
VALUES ('NEET', 'Physics', 45, 200, 4, 50, true, -1)
ON CONFLICT (exam_context, subject) DO NOTHING;

-- CBSE Math Configuration
INSERT INTO exam_configurations (exam_context, subject, total_questions, duration_minutes, marks_per_question, passing_percentage)
VALUES ('CBSE', 'Math', 40, 180, NULL, 33) -- Variable marks
ON CONFLICT (exam_context, subject) DO NOTHING;

-- Default generation rules for KCET
INSERT INTO generation_rules (exam_context, subject, weight_predicted_pattern, weight_student_weak_areas, weight_curriculum_balance, weight_recent_trends)
VALUES ('KCET', 'Math', 0.4, 0.3, 0.2, 0.1)
ON CONFLICT (exam_context, subject) DO NOTHING;

-- Default generation rules for JEE
INSERT INTO generation_rules (exam_context, subject, weight_predicted_pattern, weight_student_weak_areas, weight_curriculum_balance, weight_recent_trends, adaptive_baseline_accuracy)
VALUES ('JEE', 'Math', 0.5, 0.25, 0.15, 0.1, 70) -- JEE is harder, higher baseline
ON CONFLICT (exam_context, subject) DO NOTHING;
