# SYSTEM-WIDE SCANS SETUP
**Date:** February 13, 2026
**Goal:** Make the latest scan for each subject/exam available to ALL users

---

## 🎯 WHAT THIS DOES

**Before:**
- ❌ Only the user who scanned a paper can see those questions
- ❌ New users have 0 questions → can't practice
- ❌ Each user needs to scan everything themselves

**After:**
- ✅ Latest scan per subject/exam is shared system-wide
- ✅ New users immediately see questions
- ✅ Everyone practices from the same curated question bank
- ✅ Easy to debug and maintain (only 1 scan per combo)

---

## 📋 STEP 1: ADD DATABASE COLUMN

You need to run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
-- Add is_system_scan column
ALTER TABLE scans
ADD COLUMN IF NOT EXISTS is_system_scan BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_scans_system
ON scans(is_system_scan, subject, exam_context)
WHERE is_system_scan = TRUE;

-- Add comment
COMMENT ON COLUMN scans.is_system_scan IS
'If true, this scan is available to all users as a system resource';
```

**How to run:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Paste the SQL above
5. Click **Run**
6. Verify: You should see "Success. No rows returned"

---

## 📋 STEP 2: MARK LATEST SCANS AS SYSTEM

After adding the column, run this script:

```bash
node scripts/apply_system_scans_migration.mjs
```

**What it does:**
1. Finds the latest completed scan for each (subject, exam_context) combination
2. Clears all existing `is_system_scan = true` flags
3. Marks ONLY the latest scans as `is_system_scan = true`

**Example output:**
```
✅ Math (KCET): 03-KCET-Board-Exam-Maths-16-06-2022-M1 [07:44]
✅ Math (JEE): 04-JEE-Main-Maths-2024-Session-1
✅ Physics (KCET): 02-KCET-Board-Exam-Physics-2023
✅ Chemistry (NEET): 01-NEET-Chemistry-2024
```

---

## 📋 STEP 3: UPDATE AGGREGATOR TO INCLUDE SYSTEM SCANS

The `topicAggregator.ts` currently only fetches user's own scans:

```typescript
// Current (line 50-54)
const { data: scans } = await supabase
  .from('scans')
  .select('id, subject')
  .eq('user_id', userId)  // ← Only user's scans
  .eq('subject', subject);
```

We need to change it to fetch **user's scans + system scans**:

```typescript
// New version
const { data: scans } = await supabase
  .from('scans')
  .select('id, subject')
  .or(`user_id.eq.${userId},is_system_scan.eq.true`)  // ← User's + system
  .eq('subject', subject);
```

This is the KEY change that makes system questions available!

---

## 📋 STEP 4: TEST THE REFRESH BUTTON

After completing steps 1-3:

1. **Refresh your browser:** `Cmd+Shift+R`
2. **Go to:** Topics → Mathematics → KCET
3. **Click the Refresh button** (🔄)
4. **Check console logs:**

**Expected:**
```
✅ [TopicDashboard] Data refreshed successfully
[Learning Journey] Loaded 13 topics for Math (234+ questions)
```

**Question count should INCREASE** because now it includes:
- Your personal scans (if any)
- System scan questions (from latest scan)

---

## 🔍 VERIFICATION

### Check Which Scans Are System Scans

```bash
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data } = await supabase
  .from('scans')
  .select('name, subject, exam_context, is_system_scan, created_at')
  .eq('is_system_scan', true)
  .order('subject, exam_context');

console.log('\\n🌐 SYSTEM SCANS:\\n');
data?.forEach(s => {
  console.log(\`   ✅ \${s.subject} (\${s.exam_context}): \${s.name}\`);
});
"
```

### Test With a New User Account

1. Create a new test user account
2. Login as that user
3. Go to Topics → Mathematics → KCET
4. **Expected:** Should see topics with questions (from system scan)
5. **Before fix:** Would see 0 questions

---

## 📊 WHAT GETS SHARED

### System Scan Includes:
- ✅ All questions from the scan
- ✅ Visual sketches (if generated)
- ✅ Topic/domain categorization
- ✅ Difficulty levels, marks, metadata
- ✅ Chapter insights (if generated)
- ✅ Flashcards (if generated)

### Per-User Data (NOT shared):
- ❌ User's practice history
- ❌ User's test attempts
- ❌ User's mastery levels
- ❌ User's personal scans (is_system_scan = false)

---

## 🔄 FUTURE SCAN UPLOADS

**When you scan a new paper:**

1. Scan gets uploaded with `is_system_scan = false` (default)
2. It appears ONLY in your vault
3. **To make it system-wide:**
   - Option A: Run `apply_system_scans_migration.mjs` again
   - Option B: Manually set `is_system_scan = true` in database
   - Option C: Build an admin UI to toggle this flag

**Best Practice:**
- Review scan quality first
- Verify topics/domains are correct
- Fix any extraction errors
- THEN mark as system scan

---

## 🎨 OPTIONAL: ADMIN UI

You could build a simple admin page:

```typescript
// Admin page to manage system scans
<button onClick={async () => {
  await supabase
    .from('scans')
    .update({ is_system_scan: true })
    .eq('id', scanId);

  toast.success('Scan marked as system-wide!');
}}>
  🌐 Make System-Wide
</button>
```

---

## 🐛 TROUBLESHOOTING

### Issue: Script says column doesn't exist

**Fix:** You skipped Step 1. Go to Supabase dashboard and run the ALTER TABLE SQL.

### Issue: Question count still 174 after refresh

**Possible causes:**
1. ❌ Column not added → Check Step 1
2. ❌ Scans not marked → Check Step 2
3. ❌ Aggregator not updated → Check Step 3
4. ❌ Browser cache → Hard refresh `Cmd+Shift+R`
5. ❌ Topics don't match → Run `show_latest_scan_structure.mjs`

### Issue: New users still see 0 questions

**Check:**
```bash
# Verify system scans exist
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, count } = await supabase
  .from('scans')
  .select('*', { count: 'exact' })
  .eq('is_system_scan', true);

console.log('System scans:', count);
"
```

---

## ✅ COMPLETION CHECKLIST

- [ ] Step 1: Added `is_system_scan` column in Supabase
- [ ] Step 2: Ran migration script successfully
- [ ] Step 3: Updated `topicAggregator.ts` to fetch system scans
- [ ] Step 4: Tested refresh button (question count increased)
- [ ] Step 5: Verified with new user account (sees questions)
- [ ] Step 6: Checked latest scan has correct topics/domains

---

## 📝 NEXT STEPS

1. **Complete all 6 steps above**
2. **Test thoroughly** with new user account
3. **Verify question counts increase** in Learning Journey
4. **Check Practice Lab** also uses system questions
5. **Check Learn tab** shows system visual sketches
6. **Fix remaining "General" topic questions** (23 in latest scan)

---

END OF SYSTEM-WIDE SCANS SETUP GUIDE
