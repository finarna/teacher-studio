# Phase 6 Testing - Quick Start Card

**Time**: ~1 hour | **Status**: Ready to begin

---

## 🚀 3-Step Quick Start

### Step 1: Refresh Browser (30 seconds)
```bash
Press: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
Open DevTools: F12
Click Console tab
Clear logs: 🚫 icon
```

### Step 2: Critical Tests (30 minutes)
Run these 3 tests in order:

#### Test A: Physics + KCET
1. Click "Physics" pill (should already be selected)
2. Navigate to VisualQuestionBank
3. Select any scan with questions
4. **CHECK**: Questions load correctly
5. **CHECK**: Console shows `📦 [LOAD] Loading X questions`
6. **CHECK**: NO `❌ No questions found` error

**Result**: ✅ Pass / ❌ Fail

#### Test B: Rapid Switching
1. Rapidly click: Math → Physics → Chemistry → Biology (10 times)
2. **CHECK**: No crashes
3. **CHECK**: Console shows `⚠️ [LOAD ABORT]` messages (race condition caught!)
4. **CHECK**: NO JavaScript errors

**Result**: ✅ Pass / ❌ Fail

#### Test C: Keyboard Shortcuts
1. Press `Ctrl+1` → Math selected
2. Press `Ctrl+2` → Physics selected
3. Press `Ctrl+3` → Chemistry selected
4. Press `Ctrl+4` → Biology selected

**Result**: ✅ Pass / ❌ Fail

### Step 3: Report Results (5 minutes)
If all 3 tests pass:
```
✅ Phase 6 Critical Tests: PASSED
- Physics + KCET questions load correctly
- Rapid switching: no crashes, race conditions caught
- Keyboard shortcuts: all working

Ready for production!
```

If any test fails:
```
❌ Phase 6 Critical Tests: FAILED

Issue: [Describe what went wrong]
Steps: [How to reproduce]
Screenshot: [Attach if possible]
```

---

## Expected Console Logs

### Good (✅ Bug Fix Working)
```
🔄 [SUBJECT CHANGE] Clearing stale scan selection
⚠️ [LOAD ABORT] Scan ... not found in vault (race condition)
📦 [LOAD] Loading 22 AI-generated questions from cache
```

### Bad (❌ Bug Still Exists)
```
❌ [LOAD] No generated questions found
(When questions SHOULD exist)
```

---

## Performance Quick Check

While testing, watch for:
- **Subject switch feels instant** (<200ms)
- **No lag or jank** when switching
- **Animations smooth** (fade-in, transitions)
- **No memory issues** after rapid switching

---

## Full Testing Guide

For comprehensive testing (all 15 combinations, performance benchmarks, etc.):
📄 See: `PHASE_6_MANUAL_TEST_GUIDE.md`

---

## Emergency Rollback

If critical issues found:
```javascript
// In browser console:
setFeatureFlag('useMultiSubjectContext', false);
location.reload();
```

---

**Ready?** Refresh browser and begin Test A!
