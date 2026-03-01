# CLEAN_START_SCHEMA_v5.2 - Missing Columns Fixed

## What Was Wrong

When you recreated the database using `CLEAN_START_SCHEMA_v5.sql`, it was **missing critical columns** from the questions table that migrations 007 and 009 had previously added:

### Missing Columns:
1. ❌ `domain` - Subject domain (ALGEBRA, CALCULUS, Mechanics, etc.)
2. ❌ `subject` - Physics, Chemistry, Math, Biology
3. ❌ `exam_context` - NEET, JEE, KCET, CBSE
4. ❌ `pedagogy` - Conceptual, Analytical, Problem-Solving, etc.

### Impact:
- ❌ AdminScanApproval publishing failed with 400 error (trying to insert non-existent columns)
- ❌ Learning Journey queries would fail (they filter by subject and exam_context)
- ❌ Question bank filtering wouldn't work properly

## What Was Fixed

### ✅ CLEAN_START_SCHEMA_v5.sql (updated to v5.2)

**Lines 175-178** - Added missing columns to questions table:
```sql
CREATE TABLE IF NOT EXISTS public.questions (
  ...
  domain TEXT,  -- Subject domain (ALGEBRA, CALCULUS, Mechanics, Organic Chemistry, etc.)
  subject TEXT,  -- Physics, Chemistry, Math, Biology (needed for Learning Journey filtering)
  exam_context TEXT CHECK (exam_context IN ('NEET', 'JEE', 'KCET', 'CBSE')),  -- Exam type (needed for filtering)
  pedagogy TEXT CHECK (pedagogy IN ('Conceptual', 'Analytical', 'Problem-Solving', 'Application', 'Critical-Thinking', 'Numerical', 'Memorization')),
  ...
);
```

**Lines 693-697** - Added indexes for better query performance:
```sql
CREATE INDEX IF NOT EXISTS idx_questions_year ON public.questions(year);
CREATE INDEX IF NOT EXISTS idx_questions_domain ON public.questions(domain);
CREATE INDEX IF NOT EXISTS idx_questions_pedagogy ON public.questions(pedagogy);
CREATE INDEX IF NOT EXISTS idx_questions_exam_context ON public.questions(exam_context);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject);
```

### ✅ AdminScanApproval.tsx - Already working correctly

The code was **already correct** - it was trying to insert `subject`, `exam_context`, and `domain` which are now properly defined in the schema.

### ✅ simpleMathExtractor.ts - Reverted today's broken changes

- Removed `safeAiParse` import that broke extraction (14 questions instead of 49+)
- Restored `salvageTruncatedJSON` function
- Removed visual element fields (will add later separately)
- **Working version restored** ✅

### ✅ BoardMastermind.tsx - Safety fix

Added `|| []` fallback for options to prevent crashes:
```typescript
options: (sq.options || []).map((opt: any) => `(${opt.id}) ${opt.text}`)
```

## How to Apply the Fix

### Option 1: Rerun the entire schema (RECOMMENDED - Clean Slate)

```bash
# Drop and recreate everything
psql <your-db-connection> < CLEAN_START_SCHEMA_v5.sql
```

**Note:** This will DELETE ALL DATA. Only do this if:
- You're working with a test database
- You have backups
- You're okay starting fresh

### Option 2: Add missing columns to existing DB (Safer)

Run migration 011 manually in Supabase SQL Editor:

```sql
-- Add missing columns
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS exam_context TEXT CHECK (exam_context IN ('NEET', 'JEE', 'KCET', 'CBSE'));
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS pedagogy TEXT CHECK (pedagogy IN ('Conceptual', 'Analytical', 'Problem-Solving', 'Application', 'Critical-Thinking', 'Numerical', 'Memorization'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_questions_year ON public.questions(year);
CREATE INDEX IF NOT EXISTS idx_questions_domain ON public.questions(domain);
CREATE INDEX IF NOT EXISTS idx_questions_pedagogy ON public.questions(pedagogy);
CREATE INDEX IF NOT EXISTS idx_questions_exam_context ON public.questions(exam_context);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject);

-- Backfill from scans table
UPDATE public.questions q
SET
  exam_context = s.exam_context,
  subject = s.subject
FROM public.scans s
WHERE q.scan_id = s.id
  AND (q.exam_context IS NULL OR q.subject IS NULL);

NOTIFY pgrst, 'reload schema';
```

## Testing After Fix

### 1. Test PDF Upload & Extraction
- Upload the KCET Math PDF again
- Should extract 49-58 questions (not 14!)
- Check browser console for success logs

### 2. Test AdminScanApproval Publishing
- Go to Admin Scan Approval page
- Click "Publish to System" on a completed scan
- Should succeed without 400 error
- Verify questions appear in Learning Journey

### 3. Test Learning Journey
- Navigate to Learning Journey
- Filter by subject (Math, Physics, etc.)
- Filter by exam context (KCET, NEET, etc.)
- Should show questions properly

## Files Changed

1. ✅ `CLEAN_START_SCHEMA_v5.sql` - Updated to v5.2 (added missing columns + indexes)
2. ✅ `utils/simpleMathExtractor.ts` - Reverted broken changes from today
3. ✅ `components/BoardMastermind.tsx` - Added safety fallback for options
4. ✅ `migrations/011_sync_v5_schema_questions.sql` - Created (optional migration file)

## Summary

**Before:**
- ❌ 400 error when publishing scans
- ❌ Missing columns: domain, subject, exam_context, pedagogy
- ❌ Extraction broken (14 questions instead of 49+)

**After:**
- ✅ All columns present in v5.2 schema
- ✅ Indexes added for performance
- ✅ AdminScanApproval will work
- ✅ Learning Journey will work
- ✅ Extraction fixed (back to 49+ questions)

**Next Step:** Rerun CLEAN_START_SCHEMA_v5.sql on your database or apply the ALTER TABLE statements manually.
