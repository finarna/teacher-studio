-- Migration 013: Sketch Progress Tracking
-- Created: 2026-02-14
-- Purpose: Track user progress on visual sketch notes with duration and completion status

-- Create sketch_progress table
CREATE TABLE IF NOT EXISTS sketch_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sketch_id TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one record per user per sketch
  UNIQUE(user_id, sketch_id)
);

-- Add index for fast user queries
CREATE INDEX IF NOT EXISTS idx_sketch_progress_user_id ON sketch_progress(user_id);

-- Add index for topic-based queries
CREATE INDEX IF NOT EXISTS idx_sketch_progress_topic ON sketch_progress(user_id, topic_name, subject, exam_context);

-- Add index for completion queries
CREATE INDEX IF NOT EXISTS idx_sketch_progress_completed ON sketch_progress(user_id, completed);

-- Add RLS policies
ALTER TABLE sketch_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "Users can view own sketch progress"
  ON sketch_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own sketch progress"
  ON sketch_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own sketch progress"
  ON sketch_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sketch_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sketch_progress_updated_at
  BEFORE UPDATE ON sketch_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_sketch_progress_updated_at();

-- Add comments for documentation
COMMENT ON TABLE sketch_progress IS 'Tracks user progress on visual sketch notes including view duration and completion status';
COMMENT ON COLUMN sketch_progress.sketch_id IS 'Unique identifier for the sketch (format: scanId-topic-topicKey-page-pageIdx)';
COMMENT ON COLUMN sketch_progress.duration_seconds IS 'Total time spent viewing this sketch in seconds';
COMMENT ON COLUMN sketch_progress.completed IS 'Whether user has marked this sketch as completed';
COMMENT ON COLUMN sketch_progress.last_viewed_at IS 'Timestamp of last view/interaction with this sketch';
