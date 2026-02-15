# Automatic Question Mapping Workflow

## Overview

The publish/unpublish workflow now **automatically handles question-to-topic mapping**. No manual mapping scripts needed!

## What Changed

### Before (Manual Process ❌)
1. Admin clicks "Publish" on a scan
2. `is_system_scan` flag set to `true`
3. Questions appear in database but **NOT in Learning Journey**
4. Admin must manually run `mapQuestionsToOfficialTopics.ts` script
5. Only then do questions appear in Learning Journey

### After (Automatic Process ✅)
1. Admin clicks "Publish" on a scan
2. System automatically:
   - Sets `is_system_scan = true`
   - Maps all questions to official topics
   - Creates `topic_question_mapping` entries
   - Questions immediately appear in Learning Journey
3. **No manual intervention needed!**

## How It Works

### Publishing a Scan

When you click **"Publish to System"** in `AdminScanApproval`:

```typescript
// Step 1: Find and unpublish other scans (same subject/exam)
// - Removes their question-topic mappings
// - Sets is_system_scan = false

// Step 2: Publish the new scan
// - Sets is_system_scan = true

// Step 3: Auto-map questions to topics
// - Fetches official topics for the subject
// - Matches question.topic to topics.name (case-insensitive, partial match)
// - Creates topic_question_mapping entries
// - Questions immediately visible in Learning Journey
```

**Example Matching Logic:**
- Question topic: `"Trigonometry"`
- Official topic: `"Trigonometric Functions"`
- Match: ✅ (partial match)

### Unpublishing a Scan

When you click **"Unpublish"** in `AdminScanApproval`:

```typescript
// Step 1: Get all questions from the scan
// Step 2: Delete their topic_question_mapping entries
// Step 3: Set is_system_scan = false
// Step 4: Questions disappear from Learning Journey
```

## Benefits

### ✅ No Manual Steps
- Admins don't need to remember to run mapping scripts
- Reduces human error
- Faster workflow

### ✅ Consistency
- Every published scan automatically has mappings
- Unpublished scans automatically have mappings removed
- No orphaned mappings

### ✅ Immediate Visibility
- Questions appear in Learning Journey immediately after publish
- Questions disappear immediately after unpublish
- No delay or refresh needed

## Technical Implementation

### Files Modified

**`components/AdminScanApproval.tsx`**
- Added `mapScanQuestionsToTopics()` function
- Updated `publishScan()` to auto-map questions
- Updated `unpublishScan()` to auto-remove mappings

### New Functions

```typescript
/**
 * Automatically maps questions from a scan to official topics
 * Called when publishing a scan
 */
const mapScanQuestionsToTopics = async (
  scanId: string,
  subject: Subject
) => {
  // 1. Get official topics for subject
  // 2. Get questions from scan
  // 3. Match question.topic to topic.name
  // 4. Create topic_question_mapping entries
}
```

### Database Operations

**On Publish:**
```sql
-- 1. Remove old scan mappings (if any)
DELETE FROM topic_question_mapping
WHERE question_id IN (
  SELECT id FROM questions WHERE scan_id = 'old_scan_id'
);

-- 2. Unpublish old scans
UPDATE scans SET is_system_scan = false
WHERE subject = 'Math' AND exam_context = 'KCET';

-- 3. Publish new scan
UPDATE scans SET is_system_scan = true WHERE id = 'new_scan_id';

-- 4. Create new mappings
INSERT INTO topic_question_mapping (question_id, topic_id)
VALUES ... (auto-matched questions)
```

**On Unpublish:**
```sql
-- 1. Remove mappings
DELETE FROM topic_question_mapping
WHERE question_id IN (
  SELECT id FROM questions WHERE scan_id = 'scan_id'
);

-- 2. Unpublish scan
UPDATE scans SET is_system_scan = false WHERE id = 'scan_id';
```

## Matching Algorithm

The system uses **fuzzy matching** to map questions to topics:

```typescript
const matchingTopic = topics.find(t =>
  // Exact match (case-insensitive)
  t.name.toLowerCase() === question.topic.toLowerCase() ||

  // Official topic contains question topic
  t.name.toLowerCase().includes(question.topic.toLowerCase()) ||

  // Question topic contains official topic
  question.topic.toLowerCase().includes(t.name.toLowerCase())
);
```

**Examples:**
- Question: "Limits" → Topic: "Limits and Continuity" ✅
- Question: "Quadratic Equations" → Topic: "Quadratic" ✅
- Question: "Calculus" → Topic: "Differential Calculus" ✅
- Question: "Random" → Topic: "Probability" ❌ (no match)

## Metrics & Visibility

The Admin Scan Approval UI shows:
- **Total Questions**: Questions in the scan
- **Mapped**: Successfully matched to topics
- **Unmapped**: No matching topic found
- **Success Rate**: Percentage mapped

**Warning Alert:**
- If mapping success rate < 50%, a warning appears
- Suggests re-scanning with improved prompts
- Prevents publishing low-quality scans

## Testing

### Manual Test Steps

1. **Upload a Question Paper**
   - Use PDF scan feature
   - Wait for processing to complete

2. **Check Initial State**
   - Go to Admin Scan Approval
   - Verify scan shows as "Unpublished"
   - Check mapped/unmapped counts

3. **Publish the Scan**
   - Click "Publish to System"
   - Watch console logs for auto-mapping
   - Verify success rate

4. **Verify Learning Journey**
   - Navigate to Learning Journey
   - Select same subject/exam
   - Confirm questions appear

5. **Unpublish the Scan**
   - Click "Unpublish"
   - Verify Learning Journey updates (questions disappear)

### Automated Test

Run the test script:
```bash
npx tsx scripts/testAutoMappingWorkflow.ts
```

This tests:
- ✅ Clean slate (unpublish + remove mappings)
- ✅ Auto-mapping on publish
- ✅ Questions appear in Learning Journey
- ✅ Auto-removal on unpublish
- ✅ Questions disappear from Learning Journey

## Troubleshooting

### Problem: Low Mapping Success Rate

**Cause:** Question topics don't match official topic names

**Solutions:**
1. Check topic extraction quality in question paper scan
2. Improve scanning prompts to extract standard topic names
3. Add more official topics to `topics` table
4. Manually fix question topics before publishing

### Problem: Questions Don't Appear in Learning Journey

**Check:**
1. Is scan published? (`is_system_scan = true`)
2. Are mappings created? (Check `topic_question_mapping` table)
3. Do official topics exist for the subject?
4. Is the user's subject/exam context correct?

**Debug:**
```sql
-- Check published scans
SELECT * FROM scans WHERE is_system_scan = true;

-- Check mappings for a scan
SELECT COUNT(*) FROM topic_question_mapping
WHERE question_id IN (
  SELECT id FROM questions WHERE scan_id = 'scan_id'
);

-- Check official topics
SELECT * FROM topics WHERE subject = 'Math';
```

### Problem: Old Questions Still Visible

**Cause:** Previous scan mappings not removed

**Solution:**
- Unpublish old scan first
- This will auto-remove old mappings
- Then publish new scan

## Migration Notes

### For Existing Scans

If you have scans published before this feature:

1. **Option A: Re-publish**
   - Unpublish the scan
   - Publish it again
   - Auto-mapping will happen

2. **Option B: Manual Mapping (One-time)**
   ```bash
   npx tsx scripts/mapQuestionsToOfficialTopics.ts
   ```
   - This creates mappings for all existing questions
   - Future publishes will use auto-mapping

## Future Enhancements

### Potential Improvements

1. **ML-based Matching**
   - Use embedding similarity for topic matching
   - Handle synonyms and related topics
   - Improve matching accuracy

2. **Admin Review**
   - Show preview of mappings before publish
   - Allow manual override for specific questions
   - Bulk edit unmapped questions

3. **Topic Suggestions**
   - Suggest new topics based on unmapped questions
   - Auto-create topics from common patterns
   - Reduce manual topic management

4. **Audit Trail**
   - Track publish/unpublish history
   - Show who published what and when
   - Rollback capabilities

## References

### Related Files
- `components/AdminScanApproval.tsx` - Admin UI with auto-mapping
- `scripts/mapQuestionsToOfficialTopics.ts` - Legacy manual mapping (still works)
- `scripts/testAutoMappingWorkflow.ts` - Automated test script
- Database: `scans`, `questions`, `topics`, `topic_question_mapping`

### API Endpoints
- `GET /api/learning-journey/topics` - Fetches mapped questions for Learning Journey
- Database RPC: `get_learning_journey_topics(p_user_id, p_subject, p_exam_context)`

---

**Last Updated:** February 15, 2026
**Feature Status:** ✅ Production Ready
**Manual Mapping Required:** ❌ No (fully automatic)
