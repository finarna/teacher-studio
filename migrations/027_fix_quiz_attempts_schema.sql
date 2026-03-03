-- ============================================================================
-- Migration: Fix quiz_attempts table structure
-- Run this in Supabase SQL Editor to ensure the quiz history works
-- ============================================================================

-- Step 1: Check current structure and recreate if needed
-- The table might be an old version (e.g., from v4 schema with different columns)

-- Drop and recreate the table with the correct structure (only if data loss is acceptable)
-- OR add missing columns safely using ALTER TABLE

-- Safe approach: Add missing columns if they don't exist
DO $$
BEGIN
  -- Add topic_resource_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'topic_resource_id'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN topic_resource_id UUID REFERENCES public.topic_resources(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added topic_resource_id column';
  END IF;

  -- Add topic_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'topic_name'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN topic_name TEXT NOT NULL DEFAULT 'Unknown Topic';
    RAISE NOTICE 'Added topic_name column';
  END IF;

  -- Add subject if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'subject'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN subject TEXT NOT NULL DEFAULT 'Math';
    RAISE NOTICE 'Added subject column';
  END IF;

  -- Add exam_context if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'exam_context'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN exam_context TEXT NOT NULL DEFAULT 'KCET';
    RAISE NOTICE 'Added exam_context column';
  END IF;

  -- Add question_count if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'question_count'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN question_count INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added question_count column';
  END IF;

  -- Add questions_data if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'questions_data'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN questions_data JSONB NOT NULL DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Added questions_data column';
  END IF;

  -- Add correct_count if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'correct_count'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN correct_count INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added correct_count column';
  END IF;

  -- Add wrong_count if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'wrong_count'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN wrong_count INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added wrong_count column';
  END IF;

  -- Add accuracy_percentage if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'accuracy_percentage'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN accuracy_percentage INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added accuracy_percentage column';
  END IF;

  -- Add time_spent_seconds if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'time_spent_seconds'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN time_spent_seconds INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added time_spent_seconds column';
  END IF;

  -- Add completed_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN completed_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added completed_at column';
  END IF;

END $$;

-- Step 2: Ensure RLS is enabled and policies are correct
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quiz access" ON public.quiz_attempts;
CREATE POLICY "Quiz access" ON public.quiz_attempts 
  FOR ALL 
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Also ensure users can INSERT
DROP POLICY IF EXISTS "Users can insert quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can insert quiz attempts" ON public.quiz_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Step 3: Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_topic_resource ON public.quiz_attempts(topic_resource_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON public.quiz_attempts(created_at DESC);

-- Step 4: Grant permissions
GRANT ALL ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;

-- Verify the final structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'quiz_attempts'
ORDER BY ordinal_position;
