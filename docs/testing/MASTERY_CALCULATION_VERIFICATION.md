# Mastery Calculation Verification - Relations and Functions

**Date**: 2026-03-02
**User**: prabhubp@gmail.com
**Topic**: Relations and Functions
**Subject**: MATHS
**Exam**: KCET

---

## Current Screenshot Data (Latest)
- **Mastery Level**: 1%
- **Accuracy**: 14%
- **Questions Solved**: 11/79
- **Quizzes Taken**: 0 (assumed, not shown)
- **Notes Completed**: No (assumed, not shown)

---

## Formula Implementation (from lib/topicAggregator.ts:493-498)

```typescript
const totalQuestions = 79;
const saturationTarget = Math.min(totalQuestions, Math.max(15, Math.floor(totalQuestions * 0.5)));
const coverageWeight = Math.min(1, totalAttempted / Math.max(1, saturationTarget));

const mastery = Math.min(100, Math.round(
  (accuracy * 0.60 * coverageWeight) +
  Math.min(20, quizzesTaken * 10) +
  Math.min(10, Math.floor(totalAttempted / 10) * 5) +
  (isNotesDone ? 10 : 0)
));
```

---

## Step-by-Step Calculation

### Input Values:
- `totalQuestions` = 79
- `totalAttempted` = 11
- `accuracy` = 14%
- `quizzesTaken` = 0
- `isNotesDone` = false

### Step 1: Calculate Saturation Target
```
saturationTarget = MIN(79, MAX(15, FLOOR(79 × 0.5)))
                 = MIN(79, MAX(15, FLOOR(39.5)))
                 = MIN(79, MAX(15, 39))
                 = MIN(79, 39)
                 = 39 questions
```

**Meaning**: To get full accuracy weight, user needs to attempt at least 39 questions (50% of the pool, minimum 15).

### Step 2: Calculate Coverage Weight
```
coverageWeight = MIN(1, 11 / 39)
               = MIN(1, 0.282)
               = 0.282 (28.2% coverage)
```

**Meaning**: User has only attempted 28.2% of the saturation target, so accuracy weight is reduced proportionally.

### Step 3: Calculate Mastery Components

#### 1. Weighted Accuracy Points
```
weightedAccuracy = accuracy × 0.60 × coverageWeight
                 = 14 × 0.60 × 0.282
                 = 2.37 points
```

#### 2. Quiz Bonus
```
quizBonus = MIN(20, quizzesTaken × 10)
          = MIN(20, 0 × 10)
          = 0 points
```

#### 3. Volume Bonus
```
volumeBonus = MIN(10, FLOOR(totalAttempted / 10) × 5)
            = MIN(10, FLOOR(11 / 10) × 5)
            = MIN(10, FLOOR(1.1) × 5)
            = MIN(10, 1 × 5)
            = 5 points
```

#### 4. Notes Bonus
```
notesBonus = isNotesDone ? 10 : 0
           = false ? 10 : 0
           = 0 points
```

### Step 4: Total Mastery
```
mastery = MIN(100, ROUND(2.37 + 0 + 5 + 0))
        = MIN(100, ROUND(7.37))
        = MIN(100, 7)
        = 7%
```

---

## ⚠️ VERIFICATION RESULT

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| **Mastery** | **7%** | **1%** | ❌ **INCORRECT** |
| Accuracy | 14% | 14% | ✅ Matches |
| Attempted | 11 | 11 | ✅ Matches |
| Pending | 68 | 68 | ✅ Matches |

---

## 🔴 CRITICAL ISSUE DETECTED

The displayed mastery of **1%** does NOT match the expected **7%** based on the documented formula.

### Discrepancy: -6 percentage points

This indicates one of the following:

1. **Stale Data**: The `topic_resources` table has not been updated after recent practice sessions
2. **Calculation Bug**: The actual implementation differs from the documented formula
3. **Database Drift**: Stats are not being recalculated by `recordTopicActivity()` after each answer
4. **Caching Issue**: Frontend is showing cached/outdated data

---

## 📊 Previous Screenshot Comparison

| Screenshot | Mastery | Accuracy | Solved | Expected Mastery |
|------------|---------|----------|--------|------------------|
| **Old** | 23% | 30% | 10/79 | 10-20% |
| **Current** | 1% | 14% | 11/79 | 7% |

### Analysis:
- User answered 1 more question (10 → 11)
- Accuracy dropped significantly (30% → 14%)
- This suggests a major data inconsistency

**If 10 questions with 30% accuracy** = 3 correct answers
**Adding 1 incorrect answer** should give: 3/11 = 27.27% accuracy
**But screenshot shows 14%** = ~1.54 correct answers

This suggests either:
- Data was reset/corrupted
- Multiple questions were answered incorrectly between screenshots
- The practice_answers table has different data than displayed

---

## 🔧 Root Cause Analysis

### Code Review Findings:

1. **Auto-Recalculation IS Implemented** ✅
   - `recordTopicActivity()` at line 510-589 recalculates stats after each practice session
   - Pulls fresh data from `practice_answers` table
   - Updates `topic_resources` with calculated mastery

2. **Formula IS Correct** ✅
   - Implementation matches documentation
   - Same formula used in both `calculateTopicMastery()` and `recordTopicActivity()`

3. **Possible Failures**:
   - ❌ `recordTopicActivity()` not being called after answer submission
   - ❌ Database transaction failing silently
   - ❌ RLS policy blocking update
   - ❌ Frontend showing cached data instead of fresh database values

---

## ✅ Action Items

### Immediate Verification Needed:

1. **Check Actual Database Values** (use Supabase Dashboard):
   ```sql
   -- Get topic_resource record
   SELECT * FROM topic_resources
   WHERE user_id = '7c84204b-51f0-49e7-9155-86ea1ebd9379'
   AND subject = 'MATHS'
   AND exam_context = 'KCET'
   AND topic_id IN (
     SELECT DISTINCT topic_id FROM questions
     WHERE topic ILIKE '%relation%' OR topic ILIKE '%function%'
   );

   -- Count practice answers
   SELECT
     topic_resource_id,
     COUNT(*) as total_attempted,
     SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as total_correct,
     ROUND(AVG(CASE WHEN is_correct THEN 100 ELSE 0 END), 2) as accuracy
   FROM practice_answers
   WHERE topic_resource_id = '<topic_resource_id_from_above>'
   GROUP BY topic_resource_id;
   ```

2. **Test Stat Recalculation**:
   - Answer another practice question
   - Check browser console for any errors
   - Verify `recordTopicActivity()` is called
   - Check if mastery updates to 7% after submission

3. **Check Frontend Data Flow**:
   - Inspect component that displays mastery (MobileTopicComponents.tsx or TopicDetailPage.tsx)
   - Verify it's fetching fresh data, not using cached values
   - Check React DevTools for state updates

---

## 🎯 Expected Behavior After Fix

When the user answers another question:
- If **correct**:
  - Attempted: 12, Correct: 2-3, Accuracy: ~16-25%
  - Expected Mastery: 7-10%

- If **incorrect**:
  - Attempted: 12, Correct: 1-2, Accuracy: ~8-17%
  - Expected Mastery: 6-8%

The key is that mastery should ALWAYS be at least:
- **Base**: 5 points (volume bonus for 11+ questions)
- **Plus**: Weighted accuracy contribution
- **Minimum**: 5-7% for current stats

**Showing 1% is mathematically impossible with 11 questions attempted.**

---

## 📝 Summary

### Findings:
1. ✅ **Insights**: REAL (AI-generated with quality mandates)
2. ✅ **Solutions**: REAL (detailed steps, formulas, marking scheme, common mistakes)
3. ✅ **Formula**: CORRECT implementation in code
4. ❌ **Stats**: INCORRECT - showing 1% when should be 7%

### Root Issue:
The `topic_resources` table data is out of sync with the `practice_answers` table. Either:
- Stats are not being recalculated after practice sessions
- Database updates are failing silently
- Frontend is displaying stale cached data

### Next Step:
Answer a practice question and verify stats update correctly to 7%.
