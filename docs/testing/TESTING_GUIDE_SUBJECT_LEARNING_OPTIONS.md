# Testing Guide: Subject Learning Options

## Quick Start

### 1. Apply Database Migration

```bash
# Option 1: Manual (Recommended)
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy content from: migrations/015_custom_mock_tests.sql
4. Paste and click "Run"

# Option 2: Via script (displays instructions)
node scripts/applyMigration015.mjs
```

### 2. Restart Backend Server

```bash
# Stop current server (Ctrl+C)
# Then restart
node server-supabase.js
```

### 3. Verify Installation

Check that new endpoints are available:
```bash
# Should return weak topics data
curl "http://localhost:8888/api/learning-journey/weak-topics?userId=test&subject=Math&examContext=NEET"

# Should return empty templates array
curl "http://localhost:8888/api/learning-journey/test-templates?userId=test&subject=Math&examContext=NEET"
```

---

## Test Scenarios

### ✅ Scenario 1: Subject Menu Navigation

**Steps:**
1. Login to the app
2. Navigate to Learning Journey
3. Select trajectory (e.g., NEET)
4. Select subject (e.g., Math)

**Expected:**
- Subject Menu page appears with 3 option cards
- Stats load correctly for each option
- All cards are clickable with hover effects

**Validation:**
- [ ] Menu appears after subject selection
- [ ] 3 cards visible: Past Year Exams, Topicwise Prep, Mock Tests
- [ ] Stats show correct numbers (topics, years, questions)
- [ ] Back button returns to subject selection

---

### ✅ Scenario 2: Past Year Exams Flow

**Steps:**
1. From Subject Menu, click "Past Year Exams"
2. Review list of years
3. Click "View Vault" for any year
4. Browse questions in vault

**Expected:**
- Years listed in descending order (2024, 2023, etc.)
- Progress bars show solved/total questions
- Vault opens with ExamAnalysis component
- Questions are browsable

**Validation:**
- [ ] Years display correctly
- [ ] Progress percentages accurate
- [ ] "View Vault" opens ExamAnalysis
- [ ] Back button works from vault view
- [ ] Confetti appears if year is 100% complete

---

### ✅ Scenario 3: Topicwise Preparation (Existing)

**Steps:**
1. From Subject Menu, click "Topicwise Preparation"
2. Verify Topic Dashboard loads
3. Click a topic
4. Access Learn, Practice, Quiz, Flashcards tabs

**Expected:**
- Existing TopicDashboardPage loads
- All functionality works as before
- No regressions introduced

**Validation:**
- [ ] Dashboard displays topic heatmap
- [ ] Topic detail opens correctly
- [ ] All 5 tabs work (Learn/Practice/Quiz/Flashcards/Visual)
- [ ] No console errors

---

### ✅ Scenario 4: Mock Test Builder - Basic Creation

**Steps:**
1. From Subject Menu, click "Custom Mock Tests"
2. Enter test name: "My Practice Test"
3. Select 3-5 topics
4. Set question count: 25
5. Adjust difficulty mix: Easy 30%, Moderate 50%, Hard 20%
6. Set duration: 45 minutes
7. Click "Create Test & Start"

**Expected:**
- All inputs work correctly
- Question pool shows available count
- Test creates successfully
- TestInterface opens with 25 questions

**Validation:**
- [ ] Test name input accepts text
- [ ] Topic checkboxes work (multi-select)
- [ ] Sliders update values correctly
- [ ] Difficulty total validates (must be 100%)
- [ ] "Create Test" button enables when valid
- [ ] Test starts in TestInterface
- [ ] Questions match selected topics

---

### ✅ Scenario 5: Mock Test Builder - AI Recommendations

**Steps:**
1. Open Mock Test Builder
2. Check AI Recommendations card
3. Click "Apply Recommendations"
4. Verify suggested topics are selected

**Expected:**
- Weak topics appear with reasons
- Top 3-5 topics recommended
- "Apply Recommendations" auto-selects them
- Can be dismissed if not needed

**Validation:**
- [ ] AI card displays (even if no weak topics)
- [ ] Recommendations make sense
- [ ] Apply button works
- [ ] Topics auto-selected correctly
- [ ] Can manually adjust after applying

---

### ✅ Scenario 6: Mock Test Builder - Template Saving

**Steps:**
1. Create a test configuration
2. Check "Save this configuration as template"
3. Click "Create Test & Start"
4. Complete the test
5. Return to Mock Test Builder
6. Open template dropdown
7. Load the saved template

**Expected:**
- Template saves with test creation
- Appears in dropdown
- Loading restores all settings
- Template name matches

**Validation:**
- [ ] Checkbox for "Save as template" works
- [ ] Template appears in dropdown
- [ ] Loading template restores: name, topics, difficulty, count, duration
- [ ] Can create new test from template

---

### ✅ Scenario 7: Mock Test Builder - Validation

**Test Invalid Inputs:**

**Test 1: Empty test name**
- Leave test name blank
- Verify "Create Test" button is disabled
- Error message shown

**Test 2: No topics selected**
- Don't select any topics
- Verify button disabled
- Error message shown

**Test 3: Difficulty doesn't total 100%**
- Set Easy: 30%, Moderate: 40%, Hard: 20% (total 90%)
- Verify error message: "Difficulty mix must total 100%"
- Button disabled

**Test 4: Insufficient questions**
- Select 1 topic with only 10 questions
- Set question count to 50
- Verify warning shown
- Button disabled

**Validation:**
- [ ] All validations work
- [ ] Clear error messages
- [ ] Button states correct
- [ ] No crashes on invalid input

---

### ✅ Scenario 8: Navigation & Back Button

**Test All Back Button Flows:**

1. **From Subject Menu**
   - Click back → Returns to Subject Selection

2. **From Past Year Exams**
   - Click back → Returns to Subject Menu

3. **From Vault Detail**
   - Click back → Returns to Past Year Exams

4. **From Topic Dashboard**
   - Click back → Returns to Subject Menu

5. **From Mock Test Builder**
   - Click back → Returns to Subject Menu

6. **From Test (started from Mock Builder)**
   - Exit test → Returns to Mock Test Builder

**Validation:**
- [ ] All back buttons work
- [ ] No broken navigation
- [ ] State preserved correctly
- [ ] History stack correct

---

## Edge Cases to Test

### 🔍 No Data Scenarios

**1. No Past Year Questions**
- Use subject/exam context with no system scans
- Expected: "No questions available yet" message

**2. No Saved Templates**
- First-time user
- Expected: Dropdown shows "Load Template..." with no options

**3. No Weak Topics**
- User with high mastery on all topics
- Expected: AI card shows "No specific recommendations yet"

### 🔍 Boundary Values

**1. Minimum Test Configuration**
- 1 topic, 10 questions, 10 minutes, Easy 100%
- Expected: Test creates successfully

**2. Maximum Test Configuration**
- All topics, 100 questions, 180 minutes, various difficulty
- Expected: Test creates successfully

**3. Exactly 100% Difficulty Mix**
- Try combinations: 40/30/30, 50/25/25, etc.
- Expected: All valid combinations work

### 🔍 Error Handling

**1. Network Failure During Stats Load**
- Disconnect network
- Refresh Subject Menu
- Expected: Graceful error, doesn't crash

**2. API Error During Test Creation**
- Backend down
- Expected: Error message shown, user can retry

**3. Database Connection Lost**
- Stop database
- Expected: Appropriate error messages

---

## Performance Testing

### Load Times (Target)

| Screen | Target Load Time | Acceptable |
|--------|-----------------|------------|
| Subject Menu | < 500ms | < 1s |
| Past Year Exams | < 1s | < 2s |
| Mock Test Builder (AI load) | < 2s | < 3s |
| Test Creation | < 3s | < 5s |

### Database Query Counts

| Action | Max Queries | Notes |
|--------|-------------|-------|
| Subject Menu load | 3 | Topics, Scans, Questions count |
| Past Year Exams load | 5 | Scans, Progress per year |
| Weak Topics analysis | N+2 | N = topic count |
| Test creation | 4 | Scans, Questions (3x difficulty), Insert |

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Responsive Design Testing

### Breakpoints to Test

**Desktop (1920x1080)**
- [ ] 3-column grid for option cards
- [ ] All content visible
- [ ] No horizontal scroll

**Tablet (768x1024)**
- [ ] 2-column grid for option cards
- [ ] Touch-friendly tap targets
- [ ] Sliders work with touch

**Mobile (375x667)**
- [ ] 1-column layout
- [ ] Cards stack vertically
- [ ] All features accessible
- [ ] Text readable without zoom

---

## Accessibility Testing

- [ ] All interactive elements keyboard accessible
- [ ] Tab order logical
- [ ] Focus indicators visible
- [ ] Screen reader announces changes
- [ ] Color contrast meets WCAG AA
- [ ] Alt text on icons
- [ ] ARIA labels on complex controls

---

## Console Error Check

After each test scenario, check browser console:
- [ ] No errors (red)
- [ ] No warnings (yellow) - except expected ones
- [ ] API calls succeed
- [ ] No 404s

---

## Data Integrity Testing

### Verify Database

```sql
-- Check test_attempts includes custom_mock
SELECT test_type, COUNT(*)
FROM test_attempts
GROUP BY test_type;

-- Check test_templates table exists
SELECT COUNT(*) FROM test_templates;

-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'test_templates';
```

### Verify Created Data

After creating a custom test:
```sql
-- Find the test
SELECT * FROM test_attempts
WHERE test_type = 'custom_mock'
ORDER BY created_at DESC
LIMIT 1;

-- Check test_config column
SELECT test_config FROM test_attempts
WHERE test_type = 'custom_mock'
LIMIT 1;
```

---

## Regression Testing

**Ensure Existing Features Still Work:**

- [ ] Regular topic quizzes still work
- [ ] Subject tests still work
- [ ] Full mock tests still work
- [ ] Practice mode still works
- [ ] Flashcards still work
- [ ] Study notes still work
- [ ] Test results display correctly

---

## Sign-Off Checklist

Before marking as complete:

**Functionality:**
- [ ] All 3 learning options accessible
- [ ] Past year exams browsable
- [ ] Mock test builder creates tests
- [ ] AI recommendations work
- [ ] Templates save and load

**Quality:**
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] No broken links
- [ ] No visual glitches

**Performance:**
- [ ] Pages load within targets
- [ ] No memory leaks
- [ ] Smooth animations

**Security:**
- [ ] Users see only their data
- [ ] RLS policies work
- [ ] Input validation works

**Documentation:**
- [ ] Validation report reviewed
- [ ] Known issues documented
- [ ] Testing guide followed

---

## Known Issues / Limitations

1. **TODO Items** (Non-blocking):
   - masteredTopics stat not calculated (shows 0)
   - customTestsTaken stat not calculated (shows 0)
   - avgMockScore stat not calculated (shows 0)

2. **Migration** (Manual step required):
   - Database migration must be applied manually via Supabase Dashboard
   - Script provides instructions but doesn't auto-apply

---

## Support

If issues found during testing:

1. Check VALIDATION_REPORT_SUBJECT_LEARNING_OPTIONS.md for known issues
2. Verify database migration applied correctly
3. Check backend server logs
4. Verify .env.local has correct credentials
5. Clear browser cache and retry

---

**Last Updated:** 2026-02-16
**Version:** 1.0
