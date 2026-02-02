-- =====================================================
-- EduJourney Vault - Supabase Database Schema
-- Migration: 001 - Initial Schema
-- =====================================================
-- This schema supports:
-- - Multi-user exam analysis storage
-- - Normalized questions with polymorphic image storage
-- - Cached question banks and flashcards (with TTLs)
-- - Vidya AI chat sessions
-- - Image metadata (files stored in Supabase Storage)
-- =====================================================

-- Enable UUID extension for auto-generated IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
-- Note: Supabase Auth manages user authentication.
-- This table extends auth.users with app-specific metadata.
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- SCANS TABLE
-- =====================================================
-- Stores exam paper analysis metadata and summary data
-- Complex fields (analysisData) stored as JSONB
-- =====================================================
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic metadata
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Processing' CHECK (status IN ('Processing', 'Complete', 'Failed')),

  -- Analysis summary (denormalized for quick access)
  summary TEXT,
  overall_difficulty TEXT CHECK (overall_difficulty IN ('Easy', 'Moderate', 'Hard')),

  -- Complex data stored as JSONB (original format for backward compatibility)
  analysis_data JSONB, -- Full ExamAnalysisData object
  difficulty_distribution JSONB, -- Array of {name, percentage, color}
  blooms_taxonomy JSONB, -- Array of {name, percentage, color}
  topic_weightage JSONB, -- Array of {name, marks, color}
  trends JSONB, -- Array of {title, description, type}
  predictive_topics JSONB, -- Array of {topic, probability, reason}
  faq JSONB, -- Array of {question, answer}
  strategy JSONB, -- Array of strings

  -- Timestamps
  scan_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb -- For future extensibility
);

-- Indexes for common queries
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX idx_scans_status ON scans(status);
CREATE INDEX idx_scans_subject ON scans(subject);
CREATE INDEX idx_scans_grade ON scans(grade);
CREATE INDEX idx_scans_user_date ON scans(user_id, created_at DESC);

-- =====================================================
-- CHAPTER_INSIGHTS TABLE
-- =====================================================
-- Stores chapter-wise breakdown from exam analysis
-- One-to-many with scans
-- =====================================================
CREATE TABLE chapter_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,

  topic TEXT NOT NULL,
  total_marks INTEGER NOT NULL DEFAULT 0,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Moderate', 'Hard')),
  description TEXT,

  -- Arrays stored as JSONB
  key_concepts JSONB DEFAULT '[]'::jsonb, -- Array of strings
  important_formulas JSONB DEFAULT '[]'::jsonb, -- Array of strings
  study_resources JSONB DEFAULT '[]'::jsonb, -- Array of strings
  preparation_checklist JSONB DEFAULT '[]'::jsonb, -- Array of strings
  high_yield_topics JSONB DEFAULT '[]'::jsonb, -- Array of strings

  visual_summary TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for scan-based queries
CREATE INDEX idx_chapter_insights_scan_id ON chapter_insights(scan_id);

-- =====================================================
-- QUESTIONS TABLE
-- =====================================================
-- Normalized storage for analyzed questions
-- Frequently queried fields extracted, rest in JSONB
-- =====================================================
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,

  -- Core question data
  text TEXT NOT NULL,
  marks INTEGER NOT NULL DEFAULT 0,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Moderate', 'Hard')),
  topic TEXT NOT NULL,
  blooms TEXT, -- Bloom's taxonomy level

  -- MCQ fields
  options JSONB, -- Array of strings (for MCQs)
  correct_option_index INTEGER, -- For MCQs

  -- Solution data
  solution_steps JSONB DEFAULT '[]'::jsonb, -- Array of strings
  exam_tip TEXT,
  visual_concept TEXT,
  key_formulas JSONB DEFAULT '[]'::jsonb, -- Array of strings
  pitfalls JSONB DEFAULT '[]'::jsonb, -- Array of strings

  -- Mastery material (complex object)
  mastery_material JSONB, -- {logic, memoryTrigger, visualPrompt, commonTrap, coreConcept}

  -- Visual element metadata
  has_visual_element BOOLEAN DEFAULT FALSE,
  visual_element_type TEXT, -- diagram, table, graph, etc.
  visual_element_description TEXT,
  visual_element_position TEXT CHECK (visual_element_position IN ('above', 'below', 'inline', 'side')),
  visual_bounding_box JSONB, -- {pageNumber, x, y, width, height}

  -- URLs for generated/extracted visuals
  diagram_url TEXT, -- URL to Supabase Storage
  sketch_svg_url TEXT, -- URL to generated sketch (PNG conversion of SVG)

  -- Metadata
  source TEXT, -- Origin paper identification
  question_order INTEGER, -- Order in original paper
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_questions_scan_id ON questions(scan_id);
CREATE INDEX idx_questions_topic ON questions(topic);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_scan_order ON questions(scan_id, question_order);

-- =====================================================
-- IMAGES TABLE
-- =====================================================
-- Polymorphic image storage for:
-- - Extracted PDF images (linked to questions)
-- - Generated topic sketches (linked to scans)
-- - Generated question sketches (linked to questions)
-- Actual image files stored in Supabase Storage
-- =====================================================
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Polymorphic relationship
  entity_type TEXT NOT NULL CHECK (entity_type IN ('question', 'topic', 'scan')),
  entity_id UUID NOT NULL, -- References questions.id, scans.id, or topic sketches

  -- Image metadata
  storage_path TEXT NOT NULL, -- Path in Supabase Storage bucket
  public_url TEXT NOT NULL, -- CDN URL for frontend
  filename TEXT NOT NULL,
  mime_type TEXT DEFAULT 'image/png',
  file_size INTEGER, -- Bytes
  width INTEGER,
  height INTEGER,

  -- Image type
  image_type TEXT NOT NULL, -- 'extracted', 'sketch', 'topic_flipbook'
  image_order INTEGER DEFAULT 0, -- For multiple images per entity

  -- Additional metadata
  alt_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- {topic, page_number, etc.}

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for image retrieval
CREATE INDEX idx_images_entity ON images(entity_type, entity_id);
CREATE INDEX idx_images_scan_id ON images(entity_id) WHERE entity_type = 'scan';
CREATE INDEX idx_images_question_id ON images(entity_id) WHERE entity_type = 'question';

-- =====================================================
-- TOPIC_SKETCHES TABLE
-- =====================================================
-- Stores topic-based flip book sketches
-- Each sketch has multiple pages (stored as images)
-- =====================================================
CREATE TABLE topic_sketches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,

  -- Sketch metadata
  title TEXT,
  description TEXT,
  page_count INTEGER DEFAULT 0,

  -- JSONB storage for complex data
  pages JSONB DEFAULT '[]'::jsonb, -- Array of {title, content, imageUrl}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for topic-based queries
CREATE INDEX idx_topic_sketches_scan_id ON topic_sketches(scan_id);
CREATE INDEX idx_topic_sketches_topic ON topic_sketches(scan_id, topic);

-- =====================================================
-- QUESTION_BANKS TABLE (CACHE)
-- =====================================================
-- Cached generated question banks
-- TTL: 30 days (cleaned by trigger)
-- =====================================================
CREATE TABLE question_banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Cache key components
  cache_key TEXT UNIQUE NOT NULL,
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,

  -- Question bank data (stored as JSONB for flexibility)
  data JSONB NOT NULL,

  -- Cache metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0
);

-- Indexes for cache lookups
CREATE INDEX idx_question_banks_cache_key ON question_banks(cache_key);
CREATE INDEX idx_question_banks_user_id ON question_banks(user_id);
CREATE INDEX idx_question_banks_expires_at ON question_banks(expires_at);

-- =====================================================
-- FLASHCARDS TABLE (CACHE)
-- =====================================================
-- Cached generated flashcards
-- TTL: 30 days (cleaned by trigger)
-- =====================================================
CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Cache key
  cache_key TEXT UNIQUE NOT NULL,
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,

  -- Flashcard data (array of {id, term, definition, context})
  data JSONB NOT NULL,

  -- Cache metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0
);

-- Indexes for cache lookups
CREATE INDEX idx_flashcards_cache_key ON flashcards(cache_key);
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX idx_flashcards_expires_at ON flashcards(expires_at);

-- =====================================================
-- VIDYA_SESSIONS TABLE
-- =====================================================
-- AI chatbot conversation sessions
-- Stores full conversation history as JSONB
-- =====================================================
CREATE TABLE vidya_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Session metadata
  title TEXT,
  context_type TEXT, -- 'general', 'scan', 'lesson', etc.
  context_id UUID, -- Reference to scan, lesson, etc.

  -- Conversation data
  messages JSONB DEFAULT '[]'::jsonb, -- Array of {id, role, content, timestamp}

  -- Session state
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for session queries
CREATE INDEX idx_vidya_sessions_user_id ON vidya_sessions(user_id);
CREATE INDEX idx_vidya_sessions_active ON vidya_sessions(user_id, is_active);
CREATE INDEX idx_vidya_sessions_context ON vidya_sessions(context_type, context_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scans_updated_at BEFORE UPDATE ON scans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topic_sketches_updated_at BEFORE UPDATE ON topic_sketches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vidya_sessions_updated_at BEFORE UPDATE ON vidya_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CACHE CLEANUP FUNCTION
-- =====================================================
-- Automatically delete expired cache entries
-- Run this periodically (e.g., via Supabase cron or external scheduler)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM question_banks
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  DELETE FROM flashcards
  WHERE expires_at < NOW();

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- View for scan summaries with question counts
CREATE VIEW scan_summaries AS
SELECT
  s.id,
  s.user_id,
  s.name,
  s.grade,
  s.subject,
  s.status,
  s.summary,
  s.overall_difficulty,
  s.scan_date,
  s.created_at,
  COUNT(DISTINCT q.id) AS question_count,
  COUNT(DISTINCT ci.id) AS chapter_count,
  COUNT(DISTINCT ts.id) AS topic_sketch_count
FROM scans s
LEFT JOIN questions q ON q.scan_id = s.id
LEFT JOIN chapter_insights ci ON ci.scan_id = s.id
LEFT JOIN topic_sketches ts ON ts.scan_id = s.id
GROUP BY s.id;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE users IS 'Extended user profiles (linked to auth.users)';
COMMENT ON TABLE scans IS 'Exam paper analysis metadata and summaries';
COMMENT ON TABLE questions IS 'Normalized question storage with visual metadata';
COMMENT ON TABLE images IS 'Polymorphic image metadata (files in Storage)';
COMMENT ON TABLE chapter_insights IS 'Chapter-wise breakdown from exam analysis';
COMMENT ON TABLE topic_sketches IS 'Topic-based flip book sketches';
COMMENT ON TABLE question_banks IS 'Cached generated question banks (30d TTL)';
COMMENT ON TABLE flashcards IS 'Cached generated flashcards (30d TTL)';
COMMENT ON TABLE vidya_sessions IS 'AI chatbot conversation sessions';

COMMENT ON FUNCTION cleanup_expired_cache() IS 'Delete expired cache entries (question_banks, flashcards)';

-- =====================================================
-- INITIAL DATA (Optional)
-- =====================================================
-- Insert system user for anonymous/demo operations (optional)
-- INSERT INTO users (id, email, full_name, role)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'demo@edujourney.local', 'Demo User', 'student')
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
