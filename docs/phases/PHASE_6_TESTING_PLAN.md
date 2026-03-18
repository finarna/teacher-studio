# Phase 6: Comprehensive Testing Plan

**Date**: 2026-02-04
**Status**: 🚀 IN PROGRESS
**Duration**: 1-2 days
**Objective**: Thorough manual testing of all subject-exam combinations and edge cases

---

## Testing Overview

### Scope
- ✅ All 15 valid subject-exam combinations
- ✅ Edge cases (empty states, invalid combos, race conditions)
- ✅ Performance with 37 existing scans
- ✅ Cross-browser compatibility (Chrome, Firefox, Safari)
- ✅ Integration testing (complete user journeys)

### Test Environment
- **Browser**: Chrome 120+ (primary), Firefox 121+, Safari 17+
- **Device**: Desktop (1920x1080 minimum)
- **Data**: 37 existing scans (3 Math + 34 Physics, all KCET)
- **Network**: Local development server (http://localhost:5173)

### Success Criteria
- All 15 combinations work correctly ✅
- No data leakage between subjects ✅
- Performance targets met (<200ms subject switch) ✅
- Zero critical bugs ✅
- TypeScript compilation clean ✅

---

## Test Matrix: Subject-Exam Combinations

### Valid Combinations (15 Total)

| Subject | Exam | Has Data? | Priority | Test Upload | Test Filter | Test Theme | Status |
|---------|------|-----------|----------|-------------|-------------|------------|--------|
| **Math** | KCET | ✅ Yes (3) | HIGH | ☐ | ☐ | ☐ | Pending |
| Math | JEE | ❌ No | MEDIUM | ☐ | ☐ | ☐ | Pending |
| Math | CBSE | ❌ No | LOW | ☐ | ☐ | ☐ | Pending |
| **Physics** | **KCET** | ✅ Yes (34) | **HIGH** | ☐ | ☐ | ☐ | Pending |
| Physics | NEET | ❌ No | MEDIUM | ☐ | ☐ | ☐ | Pending |
| Physics | JEE | ❌ No | MEDIUM | ☐ | ☐ | ☐ | Pending |
| Physics | CBSE | ❌ No | LOW | ☐ | ☐ | ☐ | Pending |
| Chemistry | KCET | ❌ No | MEDIUM | ☐ | ☐ | ☐ | Pending |
| Chemistry | NEET | ❌ No | MEDIUM | ☐ | ☐ | ☐ | Pending |
| Chemistry | JEE | ❌ No | LOW | ☐ | ☐ | ☐ | Pending |
| Chemistry | CBSE | ❌ No | LOW | ☐ | ☐ | ☐ | Pending |
| Biology | KCET | ❌ No | MEDIUM | ☐ | ☐ | ☐ | Pending |
| Biology | NEET | ❌ No | HIGH | ☐ | ☐ | ☐ | Pending |
| Biology | CBSE | ❌ No | LOW | ☐ | ☐ | ☐ | Pending |

**Note**: Math doesn't support NEET (not in curriculum), Biology doesn't support JEE (not in exam pattern)

### Invalid Combinations (Auto-Correction Expected)

| Subject | Invalid Exam | Expected Auto-Correction | Test Status |
|---------|--------------|-------------------------|-------------|
| Math | NEET | → Math + KCET | ☐ Pending |
| Biology | JEE | → Biology + NEET | ☐ Pending |

---

## Test Procedures

### Test 1: Subject-Exam Combination Testing

**For Each Valid Combination** (15 tests):

#### Step-by-Step Procedure:
1. **Switch to Subject**
   - Click subject pill
   - Verify pill becomes active (colored background, bold text)
   - Verify inactive pills become gray
   - ✅ Pass / ❌ Fail: _________

2. **Select Exam**
   - Open exam dropdown
   - Verify only valid exams shown for subject
   - Select exam
   - Verify context bar updates (e.g., "Physics • KCET • 60Q, 80min")
   - ✅ Pass / ❌ Fail: _________

3. **Check Empty State** (if no scans exist)
   - Verify EmptyState component appears
   - Verify correct subject name and icon shown
   - Verify "Upload [Subject] Paper" button present
   - ✅ Pass / ❌ Fail: _________

4. **Upload Test PDF** (if not already tested)
   - Click upload button
   - Select test PDF
   - Wait for upload completion
   - Verify scan appears in BoardMastermind
   - Verify scan has correct subject + examContext
   - ✅ Pass / ❌ Fail: _________

5. **Verify Filtering**
   - Switch to different subject
   - Verify uploaded scan disappears
   - Switch back to original subject
   - Verify scan reappears
   - ✅ Pass / ❌ Fail: _________

6. **Check Theme Colors**
   - Verify subject pill uses correct color:
     - Math: Blue (#3B82F6)
     - Physics: Green (#10B981)
     - Chemistry: Purple (#8B5CF6)
     - Biology: Amber (#F59E0B)
   - Verify sidebar badge uses subject color
   - Verify active menu item glow uses subject color
   - ✅ Pass / ❌ Fail: _________

7. **Test ExamAnalysis**
   - Navigate to ExamAnalysis view
   - Verify subject badge shows in header
   - Verify charts use subject color
   - Verify exam pattern info correct
   - ✅ Pass / ❌ Fail: _________

8. **Test VisualQuestionBank**
   - Navigate to VisualQuestionBank
   - Verify questions (if any) match subject
   - Verify question cards have subject-colored stripe
   - Verify "Generate Questions" button present
   - ✅ Pass / ❌ Fail: _________

9. **Test VidyaV3 AI Context**
   - Open VidyaV3 chatbot
   - Verify subject badge in chat header
   - Ask subject-specific question
   - Verify AI knows current subject context
   - ✅ Pass / ❌ Fail: _________

10. **Check Console**
    - Open browser DevTools → Console
    - Verify no errors
    - Verify no warnings (except expected React Strict Mode)
    - ✅ Pass / ❌ Fail: _________

**Overall Result for Combination**: ✅ Pass / ❌ Fail

---

### Test 2: Edge Cases & Error Scenarios

#### 2.1 Empty States
- [ ] **New user (no scans)**:
  - Expected: EmptyState for all subjects
  - Verify: Correct subject name and icon
  - Result: _________

- [ ] **Subject with no scans**:
  - Switch to Chemistry (no scans)
  - Expected: EmptyState appears
  - Verify: "Upload Chemistry Paper" button works
  - Result: _________

- [ ] **Empty question bank**:
  - Switch to subject with scans but no generated questions
  - Expected: "Click 'Generate Questions' to create practice questions"
  - Verify: Generate button visible and functional
  - Result: _________

#### 2.2 Data Persistence
- [ ] **Subject preference persists**:
  - Switch to Chemistry
  - Refresh page (F5)
  - Expected: Still on Chemistry
  - Result: _________

- [ ] **Exam preference persists**:
  - Switch to Physics + NEET
  - Refresh page
  - Expected: Still on Physics + NEET
  - Result: _________

- [ ] **Clear localStorage**:
  - Open DevTools → Application → Local Storage
  - Clear all
  - Refresh page
  - Expected: Defaults to Physics + KCET
  - Result: _________

#### 2.3 Invalid Combinations (Auto-Correction)
- [ ] **Math + NEET** (invalid):
  - Switch to Math
  - Try to manually switch exam to NEET (not in dropdown, so skip)
  - Expected: Dropdown only shows KCET, JEE, CBSE
  - Result: _________

- [ ] **Biology + JEE** (invalid):
  - Switch to Biology
  - Try to manually switch exam to JEE (not in dropdown)
  - Expected: Dropdown only shows KCET, NEET, CBSE
  - Result: _________

#### 2.4 Race Conditions
- [ ] **Rapid subject switching** (5+ times quickly):
  - Rapidly click Math → Physics → Chemistry → Biology → Math
  - Expected: No crashes, no errors
  - Verify: Console shows `⚠️ [LOAD ABORT]` messages (catching race conditions)
  - Result: _________

- [ ] **Subject switch during upload**:
  - Start uploading Physics paper
  - Immediately switch to Math
  - Wait for upload to complete
  - Expected: Paper appears in Physics (not Math)
  - Result: _________

- [ ] **Subject switch during AI generation**:
  - Click "Generate Questions" for Physics
  - Immediately switch to Math
  - Wait for generation to complete
  - Switch back to Physics
  - Expected: Questions appear in Physics
  - Result: _________

#### 2.5 Bulk Operations
- [ ] **Bulk upload (5+ PDFs)**:
  - Select 5 Physics PDFs
  - Upload all at once
  - Expected: All get correct examContext (KCET)
  - Verify: All appear in Physics + KCET view
  - Result: _________

- [ ] **Switch during bulk upload**:
  - Start uploading 5 Physics PDFs
  - Switch to Math immediately
  - Wait for uploads to complete
  - Switch back to Physics
  - Expected: All 5 scans appear in Physics
  - Result: _________

#### 2.6 Network Conditions
- [ ] **Slow network (Fast 3G simulation)**:
  - Open DevTools → Network → Throttle to "Fast 3G"
  - Switch subjects
  - Expected: App remains responsive, shows loading states
  - Result: _________

- [ ] **Offline mode**:
  - Open DevTools → Network → Check "Offline"
  - Switch subjects
  - Expected: Shows cached scans, disables upload button
  - Result: _________

- [ ] **Backend down**:
  - Stop backend server (Ctrl+C on server terminal)
  - Switch subjects
  - Expected: Shows error toast, doesn't crash
  - Result: _________

---

### Test 3: Performance Testing

#### 3.1 Subject Switching Performance

**Test with 37 Existing Scans**:
- [ ] **Physics → Math switch**:
  - Measure time from click to content visible
  - Target: <200ms
  - Actual: _________ ms
  - Result: ✅ Pass / ❌ Fail

- [ ] **Math → Physics switch** (reverse):
  - Target: <200ms
  - Actual: _________ ms
  - Result: ✅ Pass / ❌ Fail

- [ ] **Rapid switches (10 times)**:
  - Click subjects rapidly 10 times
  - Measure average time
  - Target: <200ms average
  - Actual: _________ ms average
  - Result: ✅ Pass / ❌ Fail

#### 3.2 Filtering Performance

**useFilteredScans Hook**:
- [ ] **Filter 37 scans by Physics + KCET**:
  - Open Console
  - Look for `[Performance] Context retrieved from cache` log
  - Target: <50ms
  - Actual: _________ ms
  - Result: ✅ Pass / ❌ Fail

- [ ] **Filter 37 scans by Math + KCET**:
  - Target: <50ms
  - Actual: _________ ms
  - Result: ✅ Pass / ❌ Fail

#### 3.3 Memory Usage

- [ ] **Memory leak test**:
  - Open DevTools → Memory → Take heap snapshot
  - Switch subjects 50+ times
  - Take another heap snapshot
  - Expected: Heap size stable (no continuous growth)
  - Result: _________

#### 3.4 Page Load Time

- [ ] **Initial page load**:
  - Clear cache (Ctrl+Shift+Delete)
  - Refresh page
  - Measure time to interactive
  - Target: <3s
  - Actual: _________ s
  - Result: ✅ Pass / ❌ Fail

- [ ] **Subsequent page loads** (cached):
  - Refresh page
  - Target: <1s
  - Actual: _________ s
  - Result: ✅ Pass / ❌ Fail

---

### Test 4: Cross-Browser Compatibility

#### 4.1 Chrome (Primary Browser)
- [ ] **Version**: _________ (must be 120+)
- [ ] Subject switching works
- [ ] Keyboard shortcuts work (Ctrl+1/2/3/4)
- [ ] Animations smooth
- [ ] CSS variables applied correctly
- [ ] Console: No errors
- [ ] Result: ✅ Pass / ❌ Fail

#### 4.2 Firefox
- [ ] **Version**: _________ (must be 121+)
- [ ] Subject switching works
- [ ] Keyboard shortcuts work
- [ ] Animations smooth
- [ ] CSS variables applied correctly
- [ ] Console: No errors
- [ ] Result: ✅ Pass / ❌ Fail

#### 4.3 Safari (Mac only)
- [ ] **Version**: _________ (must be 17+)
- [ ] Subject switching works
- [ ] Keyboard shortcuts work (Cmd+1/2/3/4)
- [ ] Animations smooth
- [ ] CSS variables applied correctly
- [ ] Console: No errors
- [ ] Result: ✅ Pass / ❌ Fail

#### 4.4 Edge (Chromium)
- [ ] **Version**: _________ (optional)
- [ ] Subject switching works
- [ ] Keyboard shortcuts work
- [ ] Result: ✅ Pass / ❌ Fail

---

### Test 5: UI/UX Verification

#### 5.1 Desktop Layout (1920x1080)
- [ ] SubjectSwitcher fits in one row
- [ ] Pills have adequate spacing (8px gap)
- [ ] Text readable at 100% zoom
- [ ] Text readable at 90% zoom
- [ ] Exam dropdown opens downward (doesn't clip)
- [ ] Context bar doesn't overflow
- [ ] Result: _________

#### 5.2 Keyboard Navigation
- [ ] Tab key cycles through subject pills
- [ ] Enter key activates selected pill
- [ ] Ctrl+1 switches to Math
- [ ] Ctrl+2 switches to Physics
- [ ] Ctrl+3 switches to Chemistry
- [ ] Ctrl+4 switches to Biology
- [ ] Ctrl+E opens exam dropdown (future feature)
- [ ] Result: _________

#### 5.3 Accessibility
- [ ] Active pill has focus indicator (blue ring)
- [ ] Screen reader announces subject changes (test with NVDA/JAWS)
- [ ] Color contrast meets WCAG AA (4.5:1):
  - Math blue on white: _________
  - Physics green on white: _________
  - Chemistry purple on white: _________
  - Biology amber on white: _________
- [ ] Result: _________

#### 5.4 Visual Consistency
- [ ] Subject colors consistent across all views
- [ ] Icons match subjects:
  - Math: Calculator 🧮
  - Physics: Atom ⚛️
  - Chemistry: Flask ⚗️
  - Biology: Leaf 🌿
- [ ] Font sizes consistent (14px body, 12px secondary)
- [ ] Spacing uniform (16px between sections)
- [ ] Result: _________

#### 5.5 First-Time User Experience
- [ ] Clear localStorage to simulate new user
- [ ] Reload page
- [ ] Verify first-time tooltip appears below SubjectSwitcher
- [ ] Tooltip shows keyboard shortcuts
- [ ] Click "X" to dismiss
- [ ] Reload page
- [ ] Verify tooltip doesn't reappear
- [ ] Result: _________

---

### Test 6: Integration Testing (Complete User Journey)

#### Journey 1: New User Onboarding
1. [ ] New user arrives → Sees Physics + KCET by default
2. [ ] Sees first-time tooltip with keyboard shortcuts
3. [ ] Dismisses tooltip
4. [ ] Sees EmptyState for Physics (assuming no data)
5. [ ] Uploads first Physics paper
6. [ ] Analysis completes
7. [ ] Sees scan in BoardMastermind
8. [ ] Result: ✅ Pass / ❌ Fail

#### Journey 2: Multi-Subject Workflow
1. [ ] User on Physics + KCET with 34 scans
2. [ ] Switches to Math using Ctrl+1
3. [ ] Sees EmptyState for Math
4. [ ] Uploads Math paper
5. [ ] Analysis completes
6. [ ] Navigates to VisualQuestionBank
7. [ ] Sees "Generate Questions" button
8. [ ] Generates questions
9. [ ] Questions appear (Math only)
10. [ ] Switches back to Physics using Ctrl+2
11. [ ] Sees Physics questions only (not Math)
12. [ ] Result: ✅ Pass / ❌ Fail

#### Journey 3: AI Interaction
1. [ ] User on Physics + KCET
2. [ ] Opens VidyaV3 chatbot
3. [ ] Sees "Physics • KCET" badge in chat header
4. [ ] Asks: "Explain Newton's laws"
5. [ ] AI provides Physics-specific answer
6. [ ] Switches to Chemistry
7. [ ] Chatbot badge updates to "Chemistry • KCET"
8. [ ] Asks: "Explain Le Chatelier's principle"
9. [ ] AI provides Chemistry-specific answer
10. [ ] Result: ✅ Pass / ❌ Fail

#### Journey 4: Persistence & Multi-Session
1. [ ] User switches to Biology + NEET
2. [ ] Uploads Biology paper
3. [ ] Refreshes page (F5)
4. [ ] Still on Biology + NEET
5. [ ] Biology scan still visible
6. [ ] Logs out (if auth enabled)
7. [ ] Logs back in
8. [ ] Data persists (Biology scan still there)
9. [ ] Result: ✅ Pass / ❌ Fail

---

## Performance Benchmarks

### Target Metrics

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Subject switch | <200ms | _______ ms | ☐ |
| Scan filtering (37 scans) | <50ms | _______ ms | ☐ |
| Context cache hit | <1ms | _______ ms | ☐ |
| Context cache miss (build) | <50ms | _______ ms | ☐ |
| Page load (first) | <3s | _______ s | ☐ |
| Page load (cached) | <1s | _______ s | ☐ |
| Upload scan | <10s | _______ s | ☐ |
| Generate questions (50Q) | <30s | _______ s | ☐ |

### Browser Performance Profiling

**Chrome DevTools Performance Tab**:
1. [ ] Record performance profile during subject switch
2. [ ] Identify bottlenecks (React re-renders, DOM manipulation)
3. [ ] Document findings: _________
4. [ ] Action items for optimization: _________

---

## Bug Tracking

### Critical Bugs (Blockers)
| Bug ID | Description | Severity | Status | Reporter | Date |
|--------|-------------|----------|--------|----------|------|
| BUG-001 | Race condition in VisualQuestionBank | HIGH | ✅ FIXED | User | 2026-02-04 |
| | | | | | |

### Medium Bugs (Fix Before Launch)
| Bug ID | Description | Severity | Status | Reporter | Date |
|--------|-------------|----------|--------|----------|------|
| | | | | | |

### Low Bugs (Fix Post-Launch)
| Bug ID | Description | Severity | Status | Reporter | Date |
|--------|-------------|----------|--------|----------|------|
| | | | | | |

---

## Testing Schedule

### Day 1: Core Functionality
- **Morning (2-3 hours)**:
  - Test all 15 subject-exam combinations
  - Focus on high-priority combos (Math+KCET, Physics+KCET)
  - Test upload and filtering

- **Afternoon (2-3 hours)**:
  - Test edge cases (empty states, race conditions)
  - Test data persistence
  - Test invalid combinations

### Day 2: Performance & Integration
- **Morning (2-3 hours)**:
  - Performance testing (benchmarks, memory, network)
  - Cross-browser testing (Chrome, Firefox, Safari)

- **Afternoon (2-3 hours)**:
  - Integration testing (complete user journeys)
  - UI/UX verification
  - Documentation updates

---

## Deliverables

### Test Reports
- [ ] `PHASE_6_TEST_RESULTS.md` - Completed test matrix with results
- [ ] `PHASE_6_PERFORMANCE_REPORT.md` - Performance metrics and analysis
- [ ] `PHASE_6_BUG_REPORT.md` - List of bugs found and fixed

### Documentation Updates
- [ ] `docs/MULTI_SUBJECT_USER_GUIDE.md` - User-facing documentation
- [ ] `README.md` - Updated with multi-subject instructions
- [ ] `CHANGELOG.md` - Updated with Phase 5 + 6 changes

### Code Updates
- [ ] Fix any bugs found during testing
- [ ] Optimize performance bottlenecks (if any)
- [ ] Add any missing error handling

---

## Success Criteria Checklist

### Must-Have (Blockers if not met)
- [ ] User can switch between all 4 subjects
- [ ] Scans filter correctly by subject + exam
- [ ] Empty states show when no scans
- [ ] Theme colors update on subject switch
- [ ] localStorage persists preferences
- [ ] All existing features work unchanged
- [ ] Zero data loss
- [ ] TypeScript compilation succeeds (0 errors)
- [ ] No console errors in production build

### Performance Targets
- [ ] Subject switch time: <200ms
- [ ] Filter operation: <50ms for 100 scans
- [ ] Page load time: <3s (no regression)
- [ ] Bundle size increase: <50KB

### Quality Targets
- [ ] Zero critical bugs
- [ ] All 15 subject-exam combos work
- [ ] Desktop responsive (1280px+)
- [ ] Cross-browser compatible (Chrome, Firefox, Safari)

---

## Testing Tools

### Browser DevTools
- **Console**: Monitor errors, warnings, logs
- **Network**: Track API calls, measure response times
- **Performance**: Profile React renders, identify bottlenecks
- **Memory**: Check for memory leaks
- **Application**: Inspect localStorage, cache

### Manual Testing Aids
- **Stop watch**: Measure UX response times
- **Screen recorder**: Capture bugs for documentation
- **Note-taking app**: Document findings in real-time

---

## Notes & Observations

### General Notes:
_________________________________________________________
_________________________________________________________
_________________________________________________________

### Issues Found:
_________________________________________________________
_________________________________________________________
_________________________________________________________

### Optimization Ideas:
_________________________________________________________
_________________________________________________________
_________________________________________________________

---

## Sign-Off

### Tester Information
- **Name**: _________
- **Date Started**: _________
- **Date Completed**: _________
- **Total Hours**: _________

### Final Verdict
- [ ] ✅ PASS - Ready for production deployment
- [ ] ⚠️ CONDITIONAL PASS - Minor issues, can deploy with hotfix plan
- [ ] ❌ FAIL - Critical issues found, must fix before deployment

**Recommendation**: _________________________________________
___________________________________________________________
___________________________________________________________

---

**Status**: 📋 READY FOR TESTING
**Next Steps**: Begin Test 1 (Subject-Exam Combination Testing)
