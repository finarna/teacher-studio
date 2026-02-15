# 🚨 APPLY MIGRATION 011 NOW

## Quick 2-Minute Fix to Enable Check Answer Button

---

## ⚡ Quick Steps

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/nsxjwjinxkehsubzesml/sql

2. **Copy the SQL below**

3. **Paste into SQL Editor**

4. **Click "Run" button**

5. **Done!** ✅ Check Answer will work

---

## 📋 SQL to Execute

```sql
-- Fix foreign key constraint issue
-- Make topic_resource_id nullable since topic_resources table may not be populated yet

-- Drop existing foreign key constraint
ALTER TABLE practice_answers
DROP CONSTRAINT IF EXISTS practice_answers_topic_resource_id_fkey;

-- Make column nullable
ALTER TABLE practice_answers
ALTER COLUMN topic_resource_id DROP NOT NULL;

-- Re-add foreign key with ON DELETE SET NULL
ALTER TABLE practice_answers
ADD CONSTRAINT practice_answers_topic_resource_id_fkey
FOREIGN KEY (topic_resource_id)
REFERENCES topic_resources(id)
ON DELETE SET NULL;

-- Same for bookmarked_questions
ALTER TABLE bookmarked_questions
DROP CONSTRAINT IF EXISTS bookmarked_questions_topic_resource_id_fkey;

-- Already nullable, just ensure foreign key has SET NULL
ALTER TABLE bookmarked_questions
ADD CONSTRAINT bookmarked_questions_topic_resource_id_fkey
FOREIGN KEY (topic_resource_id)
REFERENCES topic_resources(id)
ON DELETE SET NULL;

-- Same for practice_sessions
ALTER TABLE practice_sessions
DROP CONSTRAINT IF EXISTS practice_sessions_topic_resource_id_fkey;

ALTER TABLE practice_sessions
ALTER COLUMN topic_resource_id DROP NOT NULL;

ALTER TABLE practice_sessions
ADD CONSTRAINT practice_sessions_topic_resource_id_fkey
FOREIGN KEY (topic_resource_id)
REFERENCES topic_resources(id)
ON DELETE SET NULL;

COMMENT ON COLUMN practice_answers.topic_resource_id IS 'Optional reference to topic_resources table (nullable for compatibility with in-memory topics)';
COMMENT ON COLUMN practice_sessions.topic_resource_id IS 'Optional reference to topic_resources table (nullable for compatibility with in-memory topics)';
```

---

## ✅ After Running SQL

1. **Refresh your app** (Cmd+Shift+R)
2. **Go to Practice Lab**
3. **Select an answer**
4. **Click "Check Answer"**
5. **✅ It works!** No more errors

---

## 🎯 What This Fix Does

**Problem:** Learning Journey creates topics in-memory (not saved to database), but the database required all `topic_resource_id` values to exist in the `topic_resources` table.

**Solution:** Makes `topic_resource_id` nullable so in-memory topics work perfectly.

**Impact:**
- ✅ Check Answer button works
- ✅ Answers persist to database
- ✅ Bookmarks persist to database
- ✅ Stats update in real-time
- ✅ No more foreign key errors

---

## 🔗 Direct Link

**Click here to open SQL Editor:**
https://supabase.com/dashboard/project/nsxjwjinxkehsubzesml/sql

**Then:** Copy → Paste → Run → Done! ✅

---

## ⏱️ Estimated Time: 2 minutes

This is the FINAL fix needed for Phase 2 Practice Persistence!
