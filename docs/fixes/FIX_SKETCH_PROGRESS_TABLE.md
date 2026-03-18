# 🚨 FIX MISSING SKETCH PROGRESS TABLE

## Why this is needed
The **Learn Tab** (Visual Study Notes) is currently failing to save progress because the `sketch_progress` table is missing from your Supabase database. This causes the "Mark as Mastered" status to be reset every time you reopen the topic.

---

## ⚡ Quick Steps to Fix

1. **Open Supabase Dashboard**
   - Go to: [SQL Editor](https://supabase.com/dashboard/project/nsxjwjinxkehsubzesml/sql)

2. **Copy the SQL below**

3. **Paste into SQL Editor**

4. **Click "Run"**

5. **Done!** ✅ Progress will now persist across sessions.

---

## 📋 SQL to Execute

```sql
-- Migration 013: Sketch Progress Tracking
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
CREATE INDEX IF NOT EXISTS idx_sketch_progress_topic ON sketch_progress(user_id, topic_name, subject, exam_context);
CREATE INDEX IF NOT EXISTS idx_sketch_progress_completed ON sketch_progress(user_id, completed);

-- Add RLS policies
ALTER TABLE sketch_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sketch progress"
  ON sketch_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sketch progress"
  ON sketch_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sketch progress"
  ON sketch_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_sketch_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_sketch_progress_updated_at ON sketch_progress;
CREATE TRIGGER tr_update_sketch_progress_updated_at
  BEFORE UPDATE ON sketch_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_sketch_progress_updated_at();

COMMENT ON TABLE sketch_progress IS 'Tracks user progress on visual sketch notes including view duration and completion status';
```

---

## 🎯 What I've Fixed in the Code
I have already updated `TopicDetailPage.tsx` with:
- ✅ **LocalStorage Fallback**: Even if you don't run the SQL immediately, your progress will now be saved in your browser's local storage so it doesn't reset during your current session.
- ✅ **Automatic Status Update**: The topic status will now automatically move from **"Not Started"** to **"Learning"** the moment you start studying the visual notes.
- ✅ **Dashboard Sync**: Changes in the Learn tab now reflect instantly on your dashboard metrics.
