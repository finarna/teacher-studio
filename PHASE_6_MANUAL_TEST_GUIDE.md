# Phase 6: Manual Testing Guide - Step-by-Step

**Date**: 2026-02-04
**Estimated Time**: 1-2 hours
**Prerequisites**: ✅ Automated verification passed

---

## 🚀 Before You Start

### 1. Refresh Your Browser
**IMPORTANT**: You must refresh to load the latest bug fixes!

```bash
# In your browser:
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# Or:
F5 (standard refresh)
```

### 2. Open Developer Tools
```bash
# Press F12 or:
Right-click → Inspect → Console tab
```

### 3. Clear Console
```bash
# Click the 🚫 icon in Console tab to clear old logs
```

---

## Priority Test 1: Bug Fix Verification (15 min)

### Test 1.1: Physics + KCET (34 scans exist)

**Steps**:
1. ✅ Click "Physics" subject pill (should already be selected)
2. ✅ Verify "KCET" is selected in exam dropdown
3. ✅ Check BoardMastermind view
   - Expected: Should see ~34 scans
   - Result: _______ scans visible

4. ✅ Navigate to VisualQuestionBank
5. ✅ Select any scan from dropdown
6. ✅ Check console logs
   - Expected: `📦 [LOAD] Loading X AI-generated questions from cache`
   - Actual: _______________________________

7. ✅ Verify questions display in UI
   - Expected: Questions visible, NO "❌ No questions found" error
   - Result: ✅ Pass / ❌ Fail

**Take Screenshot**: If questions display correctly ✅

---

### Test 1.2: Math + KCET (3 scans exist)

**Steps**:
1. ✅ Click "Math" subject pill (or press Ctrl+1)
2. ✅ Wait for content to update
3. ✅ Check console logs
   - Expected: `🔄 [SUBJECT CHANGE] Clearing stale scan selection`
   - Actual: _______________________________

4. ✅ Check BoardMastermind view
   - Expected: Should see ~3 scans
   - Result: _______ scans visible

5. ✅ Navigate to VisualQuestionBank
6. ✅ Select a Math scan (if questions exist)
7. ✅ Verify questions are Math-related (not Physics)
   - Result: ✅ Pass / ❌ Fail

---

### Test 1.3: Rapid Subject Switching (CRITICAL)

**Steps**:
1. ✅ Keep Console tab visible
2. ✅ Rapidly click subjects in this order (5 times):
   ```
   Math → Physics → Chemistry → Biology → Math → Physics
   ```

3. ✅ Check console logs
   - Expected: Multiple `🔄 [SUBJECT CHANGE]` messages
   - Expected: Possible `⚠️ [LOAD ABORT]` messages (race condition caught!)
   - NO "❌ No questions found" errors (if questions exist)
   - Actual logs: _______________________________

4. ✅ Verify app didn't crash
   - Result: ✅ Pass / ❌ Fail

5. ✅ Click Physics final time
6. ✅ Navigate to VisualQuestionBank
7. ✅ Verify Physics questions load correctly
   - Result: ✅ Pass / ❌ Fail

**Take Screenshot**: Of console logs showing race condition catches

---

## Priority Test 2: Keyboard Shortcuts (5 min)

### Test 2.1: Subject Switching Shortcuts

**Steps**:
1. ✅ Press `Ctrl+1` (Windows/Linux) or `Cmd+1` (Mac)
   - Expected: Math selected
   - Result: ✅ Pass / ❌ Fail

2. ✅ Press `Ctrl+2`
   - Expected: Physics selected
   - Result: ✅ Pass / ❌ Fail

3. ✅ Press `Ctrl+3`
   - Expected: Chemistry selected
   - Result: ✅ Pass / ❌ Fail

4. ✅ Press `Ctrl+4`
   - Expected: Biology selected
   - Result: ✅ Pass / ❌ Fail

**Overall Keyboard Shortcuts**: ✅ Pass / ❌ Fail

---

## Priority Test 3: Empty States (10 min)

### Test 3.1: Chemistry (No Scans)

**Steps**:
1. ✅ Click "Chemistry" pill (or press Ctrl+3)
2. ✅ Check BoardMastermind view
   - Expected: EmptyState component appears
   - Expected: Shows Chemistry icon (⚗️) and color (purple)
   - Expected: Shows "No Chemistry Papers Yet" message
   - Result: ✅ Pass / ❌ Fail

3. ✅ Check console
   - Expected: `❌ [LOAD ABORT] No scans available for Chemistry`
   - Actual: _______________________________

**Take Screenshot**: Of EmptyState for Chemistry

---

### Test 3.2: Biology (No Scans)

**Steps**:
1. ✅ Click "Biology" pill (or press Ctrl+4)
2. ✅ Check EmptyState
   - Expected: Biology icon (🌿) and color (amber)
   - Expected: "No Biology Papers Yet" message
   - Result: ✅ Pass / ❌ Fail

---

## Priority Test 4: Theme Colors (10 min)

### Test 4.1: Verify Subject Colors

**Visual Check** - For each subject, verify:

#### Math (Blue #3B82F6)
1. ✅ Click Math pill
2. ✅ Check active pill background: Light blue
3. ✅ Check sidebar badge: Blue
4. ✅ Check active menu item glow: Blue
5. ✅ Navigate to ExamAnalysis
6. ✅ Check chart colors: Blue
   - Result: ✅ Pass / ❌ Fail

#### Physics (Green #10B981)
1. ✅ Click Physics pill
2. ✅ Verify green colors throughout
   - Result: ✅ Pass / ❌ Fail

#### Chemistry (Purple #8B5CF6)
1. ✅ Click Chemistry pill
2. ✅ Verify purple colors throughout
   - Result: ✅ Pass / ❌ Fail

#### Biology (Amber #F59E0B)
1. ✅ Click Biology pill
2. ✅ Verify amber colors throughout
   - Result: ✅ Pass / ❌ Fail

**Take Screenshot**: Of each subject's theme (4 screenshots total)

---

## Priority Test 5: Animations (5 min)

### Test 5.1: Subject Pill Transitions

**Steps**:
1. ✅ Hover over inactive Math pill
   - Expected: Pill scales up slightly, shadow increases
   - Result: ✅ Pass / ❌ Fail

2. ✅ Click Math pill
   - Expected: Smooth transition to active state
   - Result: ✅ Pass / ❌ Fail

3. ✅ Switch to Physics
   - Expected: Smooth fade-in of scan grid
   - Expected: No jank or layout shifts
   - Result: ✅ Pass / ❌ Fail

---

## Priority Test 6: First-Time User Experience (5 min)

### Test 6.1: Tooltip Display

**Steps**:
1. ✅ Open DevTools → Application → Local Storage
2. ✅ Find key: `edujourney_seen_multi_subject_hints`
3. ✅ Delete this key
4. ✅ Refresh page (F5)
5. ✅ Check below SubjectSwitcher
   - Expected: Tooltip appears with keyboard shortcuts
   - Expected: Beautiful gradient background (blue-50 to indigo-50)
   - Result: ✅ Pass / ❌ Fail

6. ✅ Click "X" to dismiss tooltip
7. ✅ Refresh page again
   - Expected: Tooltip doesn't reappear
   - Result: ✅ Pass / ❌ Fail

**Take Screenshot**: Of first-time tooltip

---

## Priority Test 7: Data Persistence (10 min)

### Test 7.1: Subject Preference Persists

**Steps**:
1. ✅ Click Biology pill
2. ✅ Refresh page (F5)
   - Expected: Still on Biology
   - Result: ✅ Pass / ❌ Fail

3. ✅ Click Math pill
4. ✅ Refresh page
   - Expected: Still on Math
   - Result: ✅ Pass / ❌ Fail

---

### Test 7.2: Exam Preference Persists

**Steps**:
1. ✅ Click Physics pill
2. ✅ Select "NEET" from exam dropdown
3. ✅ Refresh page
   - Expected: Still shows Physics + NEET
   - Result: ✅ Pass / ❌ Fail

---

### Test 7.3: Default Preferences

**Steps**:
1. ✅ Open DevTools → Application → Local Storage
2. ✅ Delete key: `edujourney_preferences`
3. ✅ Refresh page
   - Expected: Defaults to Physics + KCET
   - Result: ✅ Pass / ❌ Fail

---

## Priority Test 8: Performance Benchmarks (15 min)

### Test 8.1: Subject Switch Time

**Steps**:
1. ✅ Open DevTools → Console
2. ✅ Click Physics pill
3. ✅ Look for performance logs
   - Look for: `[Performance] Context retrieved from cache`
   - Look for: Duration in milliseconds
   - Actual duration: _______ ms
   - Target: <200ms
   - Result: ✅ Pass / ❌ Fail

### Test 8.2: Page Load Time

**Steps**:
1. ✅ Open DevTools → Network tab
2. ✅ Refresh page (F5)
3. ✅ Wait for page to fully load
4. ✅ Check "Finish" time at bottom of Network tab
   - Actual time: _______ s
   - Target: <3s
   - Result: ✅ Pass / ❌ Fail

---

## Additional Tests (Optional - 30 min)

### Test 9: VidyaV3 AI Context

**Steps**:
1. ✅ Click Physics pill
2. ✅ Open VidyaV3 chatbot
3. ✅ Check header badge shows "Physics • KCET"
   - Result: ✅ Pass / ❌ Fail

4. ✅ Ask: "Explain Newton's laws"
5. ✅ Verify AI provides Physics-specific answer
   - Result: ✅ Pass / ❌ Fail

6. ✅ Switch to Chemistry (Ctrl+3)
7. ✅ Check badge updates to "Chemistry • KCET"
   - Result: ✅ Pass / ❌ Fail

---

### Test 10: Exam Dropdown Filtering

**Steps**:
1. ✅ Click Math pill
2. ✅ Open exam dropdown
   - Expected: Shows KCET, JEE, CBSE only (no NEET)
   - Result: ✅ Pass / ❌ Fail

3. ✅ Click Biology pill
4. ✅ Open exam dropdown
   - Expected: Shows KCET, NEET, CBSE only (no JEE)
   - Result: ✅ Pass / ❌ Fail

---

## Test Results Summary

### Critical Tests (Must Pass)
| Test | Status | Notes |
|------|--------|-------|
| Physics + KCET scans visible | ☐ Pass / ☐ Fail | _______ |
| Math + KCET scans visible | ☐ Pass / ☐ Fail | _______ |
| Rapid switching no crashes | ☐ Pass / ☐ Fail | _______ |
| Race condition caught in logs | ☐ Pass / ☐ Fail | _______ |
| No "No questions found" errors | ☐ Pass / ☐ Fail | _______ |
| Keyboard shortcuts work | ☐ Pass / ☐ Fail | _______ |
| Theme colors correct | ☐ Pass / ☐ Fail | _______ |

### Overall Result
- [ ] ✅ ALL TESTS PASSED - Ready for production
- [ ] ⚠️ MINOR ISSUES - Document and fix
- [ ] ❌ CRITICAL BUGS - Must fix before deployment

---

## Issues Found

### Critical Issues (Blockers)
| Issue | Description | Severity | Screenshot |
|-------|-------------|----------|------------|
| | | | |

### Medium Issues (Fix Before Launch)
| Issue | Description | Severity | Screenshot |
|-------|-------------|----------|------------|
| | | | |

### Low Issues (Fix Post-Launch)
| Issue | Description | Severity | Screenshot |
|-------|-------------|----------|------------|
| | | | |

---

## Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Subject switch time | <200ms | _______ ms | ☐ Pass / ☐ Fail |
| Page load time | <3s | _______ s | ☐ Pass / ☐ Fail |
| Context cache hit | <1ms | _______ ms | ☐ Pass / ☐ Fail |

---

## Console Logs Reference

### Expected Log Messages (Good ✅)
```
🔄 [SUBJECT CHANGE] Clearing stale scan selection
⚠️ [LOAD ABORT] Scan ... not found in ... vault (race condition)
📦 [LOAD] Loading 22 AI-generated questions from cache
[Performance] Context retrieved from cache (0.5ms)
```

### Unexpected Log Messages (Bad ❌)
```
❌ [LOAD] No generated questions found
(When questions SHOULD exist - this means bug persists)

❌ TypeError: ...
❌ Uncaught error: ...
(Any JavaScript errors mean critical bug)
```

---

## Testing Tips

### Tip 1: Use Console Filtering
```
# In Console tab, use filter box to search for:
"LOAD"      - See all question loading logs
"SUBJECT"   - See all subject change logs
"ABORT"     - See all race condition catches
"ERROR"     - See all errors
```

### Tip 2: Take Screenshots
- Press `Win+Shift+S` (Windows) or `Cmd+Shift+4` (Mac)
- Screenshot every critical test result
- Save to `screenshots/phase6/` folder

### Tip 3: Use Network Tab
- Watch for API calls: `/api/scans?subject=...&examContext=...`
- Check response times
- Verify filtering parameters correct

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Fill out test results in this document
2. Create `PHASE_6_TEST_RESULTS.md` with summary
3. Update `README.md` with multi-subject documentation
4. Prepare for production deployment

### If Issues Found ⚠️
1. Document all issues in this guide
2. Take screenshots of bugs
3. Note exact steps to reproduce
4. Report back for fixes

---

## Time Tracking

- **Start Time**: _________
- **End Time**: _________
- **Total Duration**: _________ minutes

---

**Status**: 📋 READY FOR MANUAL TESTING
**Start**: Refresh browser and begin with Priority Test 1
**Support**: Report any issues immediately for rapid fixes
