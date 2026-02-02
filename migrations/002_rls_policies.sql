-- =====================================================
-- EduJourney Vault - Row Level Security (RLS) Policies
-- Migration: 002 - RLS Policies
-- =====================================================
-- Ensures multi-user data isolation at the database level
-- Users can only access their own scans, questions, and cached data
-- =====================================================

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_sketches ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE vidya_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================
-- Users can only view and update their own profile
-- =====================================================

-- SELECT: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- INSERT: Users can create their own profile (triggered by signup)
CREATE POLICY "Users can insert own profile"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- =====================================================
-- SCANS TABLE POLICIES
-- =====================================================
-- Users can only access their own scans
-- =====================================================

-- SELECT: Users can view their own scans
CREATE POLICY "Users can view own scans"
ON scans FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can create scans for themselves
CREATE POLICY "Users can create own scans"
ON scans FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own scans
CREATE POLICY "Users can update own scans"
ON scans FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: Users can delete their own scans
CREATE POLICY "Users can delete own scans"
ON scans FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- CHAPTER_INSIGHTS TABLE POLICIES
-- =====================================================
-- Inherit access from parent scan
-- =====================================================

-- SELECT: Users can view chapter insights for their scans
CREATE POLICY "Users can view own chapter insights"
ON chapter_insights FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM scans
    WHERE scans.id = chapter_insights.scan_id
    AND scans.user_id = auth.uid()
  )
);

-- INSERT: Users can create chapter insights for their scans
CREATE POLICY "Users can create chapter insights for own scans"
ON chapter_insights FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM scans
    WHERE scans.id = chapter_insights.scan_id
    AND scans.user_id = auth.uid()
  )
);

-- DELETE: Users can delete chapter insights from their scans
CREATE POLICY "Users can delete own chapter insights"
ON chapter_insights FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM scans
    WHERE scans.id = chapter_insights.scan_id
    AND scans.user_id = auth.uid()
  )
);

-- =====================================================
-- QUESTIONS TABLE POLICIES
-- =====================================================
-- Inherit access from parent scan
-- =====================================================

-- SELECT: Users can view questions from their scans
CREATE POLICY "Users can view questions from own scans"
ON questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM scans
    WHERE scans.id = questions.scan_id
    AND scans.user_id = auth.uid()
  )
);

-- INSERT: Users can create questions for their scans
CREATE POLICY "Users can create questions for own scans"
ON questions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM scans
    WHERE scans.id = questions.scan_id
    AND scans.user_id = auth.uid()
  )
);

-- UPDATE: Users can update questions from their scans
CREATE POLICY "Users can update questions from own scans"
ON questions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM scans
    WHERE scans.id = questions.scan_id
    AND scans.user_id = auth.uid()
  )
);

-- DELETE: Users can delete questions from their scans
CREATE POLICY "Users can delete questions from own scans"
ON questions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM scans
    WHERE scans.id = questions.scan_id
    AND scans.user_id = auth.uid()
  )
);

-- =====================================================
-- IMAGES TABLE POLICIES
-- =====================================================
-- Complex: Images can belong to questions or scans
-- Access inherited from parent entity
-- =====================================================

-- SELECT: Users can view images from their entities
CREATE POLICY "Users can view images from own entities"
ON images FOR SELECT
USING (
  CASE entity_type
    -- Images linked to questions
    WHEN 'question' THEN EXISTS (
      SELECT 1 FROM questions q
      JOIN scans s ON s.id = q.scan_id
      WHERE q.id = images.entity_id
      AND s.user_id = auth.uid()
    )
    -- Images linked to scans or topics
    WHEN 'scan' THEN EXISTS (
      SELECT 1 FROM scans s
      WHERE s.id = images.entity_id
      AND s.user_id = auth.uid()
    )
    WHEN 'topic' THEN EXISTS (
      SELECT 1 FROM topic_sketches ts
      JOIN scans s ON s.id = ts.scan_id
      WHERE ts.id = images.entity_id
      AND s.user_id = auth.uid()
    )
    ELSE false
  END
);

-- INSERT: Users can create images for their entities
CREATE POLICY "Users can create images for own entities"
ON images FOR INSERT
WITH CHECK (
  CASE entity_type
    WHEN 'question' THEN EXISTS (
      SELECT 1 FROM questions q
      JOIN scans s ON s.id = q.scan_id
      WHERE q.id = images.entity_id
      AND s.user_id = auth.uid()
    )
    WHEN 'scan' THEN EXISTS (
      SELECT 1 FROM scans s
      WHERE s.id = images.entity_id
      AND s.user_id = auth.uid()
    )
    WHEN 'topic' THEN EXISTS (
      SELECT 1 FROM topic_sketches ts
      JOIN scans s ON s.id = ts.scan_id
      WHERE ts.id = images.entity_id
      AND s.user_id = auth.uid()
    )
    ELSE false
  END
);

-- DELETE: Users can delete images from their entities
CREATE POLICY "Users can delete images from own entities"
ON images FOR DELETE
USING (
  CASE entity_type
    WHEN 'question' THEN EXISTS (
      SELECT 1 FROM questions q
      JOIN scans s ON s.id = q.scan_id
      WHERE q.id = images.entity_id
      AND s.user_id = auth.uid()
    )
    WHEN 'scan' THEN EXISTS (
      SELECT 1 FROM scans s
      WHERE s.id = images.entity_id
      AND s.user_id = auth.uid()
    )
    WHEN 'topic' THEN EXISTS (
      SELECT 1 FROM topic_sketches ts
      JOIN scans s ON s.id = ts.scan_id
      WHERE ts.id = images.entity_id
      AND s.user_id = auth.uid()
    )
    ELSE false
  END
);

-- =====================================================
-- TOPIC_SKETCHES TABLE POLICIES
-- =====================================================
-- Inherit access from parent scan
-- =====================================================

-- SELECT: Users can view topic sketches from their scans
CREATE POLICY "Users can view topic sketches from own scans"
ON topic_sketches FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM scans
    WHERE scans.id = topic_sketches.scan_id
    AND scans.user_id = auth.uid()
  )
);

-- INSERT: Users can create topic sketches for their scans
CREATE POLICY "Users can create topic sketches for own scans"
ON topic_sketches FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM scans
    WHERE scans.id = topic_sketches.scan_id
    AND scans.user_id = auth.uid()
  )
);

-- UPDATE: Users can update topic sketches from their scans
CREATE POLICY "Users can update topic sketches from own scans"
ON topic_sketches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM scans
    WHERE scans.id = topic_sketches.scan_id
    AND scans.user_id = auth.uid()
  )
);

-- DELETE: Users can delete topic sketches from their scans
CREATE POLICY "Users can delete topic sketches from own scans"
ON topic_sketches FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM scans
    WHERE scans.id = topic_sketches.scan_id
    AND scans.user_id = auth.uid()
  )
);

-- =====================================================
-- QUESTION_BANKS TABLE POLICIES (CACHE)
-- =====================================================
-- Users can only access their own cached question banks
-- =====================================================

-- SELECT: Users can view their own cached question banks
CREATE POLICY "Users can view own question banks"
ON question_banks FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can create question banks for themselves
CREATE POLICY "Users can create own question banks"
ON question_banks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own question banks (e.g., access_count)
CREATE POLICY "Users can update own question banks"
ON question_banks FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: Users can delete their own question banks
CREATE POLICY "Users can delete own question banks"
ON question_banks FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- FLASHCARDS TABLE POLICIES (CACHE)
-- =====================================================
-- Users can only access their own cached flashcards
-- =====================================================

-- SELECT: Users can view their own cached flashcards
CREATE POLICY "Users can view own flashcards"
ON flashcards FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can create flashcards for themselves
CREATE POLICY "Users can create own flashcards"
ON flashcards FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own flashcards
CREATE POLICY "Users can update own flashcards"
ON flashcards FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: Users can delete their own flashcards
CREATE POLICY "Users can delete own flashcards"
ON flashcards FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- VIDYA_SESSIONS TABLE POLICIES
-- =====================================================
-- Users can only access their own chat sessions
-- =====================================================

-- SELECT: Users can view their own chat sessions
CREATE POLICY "Users can view own vidya sessions"
ON vidya_sessions FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can create chat sessions for themselves
CREATE POLICY "Users can create own vidya sessions"
ON vidya_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own chat sessions
CREATE POLICY "Users can update own vidya sessions"
ON vidya_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: Users can delete their own chat sessions
CREATE POLICY "Users can delete own vidya sessions"
ON vidya_sessions FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- SERVICE ROLE BYPASS
-- =====================================================
-- Server-side code using service_role key bypasses RLS
-- This is intentional for backend operations
-- Frontend uses anon key which enforces RLS
-- =====================================================

-- =====================================================
-- TESTING RLS POLICIES
-- =====================================================
-- To test RLS policies, create test users and verify isolation:
--
-- 1. Create two test users (via Supabase Auth or dashboard)
-- 2. Insert test data for each user
-- 3. Verify User A cannot see User B's data:
--
--   SET LOCAL ROLE authenticated;
--   SET LOCAL request.jwt.claims.sub = '<user_a_uuid>';
--   SELECT * FROM scans; -- Should only show User A's scans
--
--   SET LOCAL request.jwt.claims.sub = '<user_b_uuid>';
--   SELECT * FROM scans; -- Should only show User B's scans
--
-- =====================================================

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON POLICY "Users can view own profile" ON users IS 'Users can only view their own profile data';
COMMENT ON POLICY "Users can view own scans" ON scans IS 'Users can only access scans they created';
COMMENT ON POLICY "Users can view questions from own scans" ON questions IS 'Questions inherit access from parent scan';
COMMENT ON POLICY "Users can view images from own entities" ON images IS 'Images inherit access from parent entity (question/scan/topic)';

-- =====================================================
-- END OF RLS POLICIES
-- =====================================================
