# Multi-Subject Implementation Checklist

**Phase-by-phase implementation guide with file-level tasks.**

---

## Pre-Implementation

- [ ] Review all documentation
  - [ ] Read MULTI_SUBJECT_ARCHITECTURE.md
  - [ ] Read MULTI_SUBJECT_QUICK_REFERENCE.md
  - [ ] Read MULTI_SUBJECT_API_SPEC.md
- [ ] Backup Redis database
  ```bash
  redis-cli SAVE
  cp /var/lib/redis/dump.rdb /backup/dump_$(date +%Y%m%d).rdb
  ```
- [ ] Create feature branch
  ```bash
  git checkout -b feature/multi-subject-architecture
  ```
- [ ] Install dependencies (if any new ones)
  ```bash
  npm install
  ```

---

## Phase 1: Foundation (Days 1-3)

### Goal
Set up type system, configurations, and context without breaking existing features.

### Files to Create

#### 1. `types.ts` (MODIFY)

- [ ] Add `ExamContext` type
  ```typescript
  export type ExamContext = 'KCET' | 'NEET' | 'JEE' | 'CBSE';
  ```
- [ ] Add `SubjectConfiguration` interface
- [ ] Add `ExamConfiguration` interface
- [ ] Add `UserPreferences` interface
- [ ] Update `Scan` interface with `examContext: ExamContext` field
- [ ] Test: Type checking passes (`npm run build`)

#### 2. `config/subjects.ts` (NEW)

- [ ] Create file in `config/` directory
- [ ] Export `SUBJECT_CONFIGS` constant
- [ ] Define all 4 subjects (Math, Physics, Chemistry, Biology)
- [ ] Export `getSubjectConfig()` utility
- [ ] Export `getAllSubjects()` utility
- [ ] Test: Import in another file successfully

#### 3. `config/exams.ts` (NEW)

- [ ] Create file in `config/` directory
- [ ] Export `EXAM_CONFIGS` constant
- [ ] Define all 4 exams (KCET, NEET, JEE, CBSE)
- [ ] Export `getExamConfig()` utility
- [ ] Export `getExamsForSubject()` utility
- [ ] Test: Import and access configs

#### 4. `contexts/AppContext.tsx` (NEW)

- [ ] Create file in `contexts/` directory
- [ ] Define `AppContextType` interface
- [ ] Implement `AppContextProvider` component
- [ ] Implement `useAppContext` hook
- [ ] Add localStorage persistence logic
- [ ] Add subject-exam validation logic
- [ ] Add auto-correction for invalid combinations
- [ ] Test: Wrap test component, verify context works

#### 5. `hooks/useFilteredScans.ts` (NEW)

- [ ] Create file in `hooks/` directory
- [ ] Implement `useFilteredScans` hook with useMemo
- [ ] Implement `useSubjectStats` hook
- [ ] Test: Verify filtering logic with mock data

#### 6. `hooks/useSubjectTheme.ts` (NEW)

- [ ] Create file in `hooks/` directory
- [ ] Implement CSS variable updates via useEffect
- [ ] Return theme object (color, colorLight, colorDark, icon)
- [ ] Test: Verify CSS variables update on mount

#### 7. `index.css` (MODIFY)

- [ ] Add CSS variables for subject theming
  ```css
  :root {
    --subject-primary: #3B82F6;
    --subject-light: #DBEAFE;
    --subject-dark: #1E40AF;
  }
  ```
- [ ] Test: CSS variables accessible in components

### Testing Phase 1

- [ ] TypeScript compilation succeeds
- [ ] All configs import without errors
- [ ] Context provider doesn't crash app
- [ ] localStorage reads/writes work
- [ ] CSS variables defined

**Commit:**
```bash
git add .
git commit -m "Phase 1: Add multi-subject foundation (types, configs, context)"
```

---

## Phase 2: UI Components (Days 4-6)

### Goal
Build subject switcher and empty state components.

### Files to Create

#### 1. `components/SubjectSwitcher.tsx` (NEW)

- [ ] Create component file
- [ ] Import useAppContext hook
- [ ] Import subject/exam configs
- [ ] Import Lucide icons dynamically
- [ ] Build subject pill buttons (4 subjects)
- [ ] Build exam dropdown selector
- [ ] Add active subject indicator bar
- [ ] Style with Tailwind (responsive)
- [ ] Test: Click switches subject/exam

#### 2. `components/EmptyState.tsx` (NEW)

- [ ] Create component file
- [ ] Accept `onUpload` prop
- [ ] Use useAppContext for subject/exam
- [ ] Display subject icon and color
- [ ] Show contextual message based on subject
- [ ] Add upload button
- [ ] Test: Shows correct subject info

### Files to Modify

#### 3. `App.tsx` (MODIFY)

- [ ] Import `AppContextProvider`
- [ ] Import `SubjectSwitcher`
- [ ] Wrap entire app content with `<AppContextProvider>`
- [ ] Add `<SubjectSwitcher />` at top of layout
- [ ] Test: App loads, switcher visible, no crashes

#### 4. `components/Sidebar.tsx` (MODIFY)

- [ ] Import `useAppContext`
- [ ] Add subject badge below logo
  - [ ] Display current subject emoji + name
  - [ ] Display current exam name
  - [ ] Use subject colors
- [ ] Update active menu item styling
  - [ ] Add subject color to box-shadow
- [ ] Test: Badge updates on subject switch

#### 5. `components/BoardMastermind.tsx` (MODIFY)

- [ ] Import `useAppContext`, `useFilteredScans`, `EmptyState`
- [ ] Remove local state for `selectedSubject` and `selectedGrade`
- [ ] Use `activeSubject` and `activeExamContext` from context
- [ ] Use `useFilteredScans()` to filter recent scans
- [ ] Show `<EmptyState />` when no scans
- [ ] Update file upload to include `examContext`
- [ ] Add subject stats cards using `useSubjectStats()`
- [ ] Test: Scans filter correctly, upload includes examContext

#### 6. `components/ExamAnalysis.tsx` (MODIFY)

- [ ] Import `useAppContext`, `useSubjectTheme`
- [ ] Add subject badge in header
  - [ ] Show subject emoji + name
  - [ ] Show exam name
  - [ ] Use subject colors
- [ ] Update chart colors to use `theme.color`
- [ ] Test: Charts use dynamic colors

### Testing Phase 2

- [ ] Subject switcher renders correctly
- [ ] Clicking subject pill switches context
- [ ] Exam dropdown filters by subject
- [ ] Sidebar badge shows active subject
- [ ] BoardMastermind filters scans
- [ ] Empty state shows when no scans
- [ ] ExamAnalysis charts use subject colors
- [ ] Theme colors update on switch
- [ ] Mobile responsive

**Commit:**
```bash
git add .
git commit -m "Phase 2: Add SubjectSwitcher and update core components"
```

---

## Phase 3: Backend Integration (Days 7-8)

### Goal
Update API to support examContext field and filtering.

### Files to Modify

#### 1. `server.js` (MODIFY)

- [ ] Update `GET /api/scans` endpoint
  - [ ] Add `subject` query parameter
  - [ ] Add `examContext` query parameter
  - [ ] Filter scans based on query params
- [ ] Update `POST /api/scans` endpoint
  - [ ] Validate `examContext` is present
  - [ ] Validate `examContext` is valid value
  - [ ] Validate subject-exam compatibility
  - [ ] Return error if invalid
- [ ] Add `GET /api/stats/subjects` endpoint (NEW)
  - [ ] Aggregate scans by subject
  - [ ] Count questions per subject
  - [ ] Count exams per subject
- [ ] Add `GET /api/stats/exams` endpoint (NEW)
  - [ ] Aggregate scans by exam
  - [ ] Count questions per exam
  - [ ] Count subjects per exam
- [ ] Test each endpoint with curl/Postman

### Files to Create

#### 2. `scripts/migrateExamContext.js` (NEW)

- [ ] Create migration script file
- [ ] Connect to Redis
- [ ] Fetch all scans
- [ ] Add default `examContext` to scans without it
  - [ ] Math → KCET
  - [ ] Physics → KCET
  - [ ] Chemistry → KCET
  - [ ] Biology → NEET
- [ ] Save updated scans back to Redis
- [ ] Log migration summary
- [ ] Test: Run script, verify scans updated

### Testing Phase 3

- [ ] GET /api/scans returns all scans
- [ ] GET /api/scans?subject=Physics returns filtered
- [ ] GET /api/scans?examContext=KCET returns filtered
- [ ] POST /api/scans validates examContext
- [ ] POST /api/scans rejects invalid examContext
- [ ] GET /api/stats/subjects returns correct counts
- [ ] Migration script runs successfully
- [ ] Existing scans have examContext field

**Run Migration:**
```bash
node scripts/migrateExamContext.js
```

**Test API:**
```bash
curl http://localhost:9001/api/scans?subject=Physics
curl http://localhost:9001/api/stats/subjects
```

**Commit:**
```bash
git add .
git commit -m "Phase 3: Add backend API support for examContext"
```

---

## Phase 4: Feature Completeness (Days 9-11)

### Goal
Update all remaining components to be subject-aware.

### Files to Modify

#### 1. `components/VisualQuestionBank.tsx` (MODIFY)

- [ ] Import `useFilteredScans`
- [ ] Filter questions by active subject/exam
- [ ] Add subject filter tabs
- [ ] Update question cards with subject color stripe
- [ ] Test: Questions filter correctly

#### 2. `components/SketchGallery.tsx` (MODIFY)

- [ ] Import `useSubjectTheme`
- [ ] Filter sketches by subject
- [ ] Apply subject colors to sketch cards
- [ ] Test: Sketches filter and theme correctly

#### 3. `components/VidyaV3.tsx` (MODIFY)

- [ ] Import `useAppContext`
- [ ] Add subject context badge in header
- [ ] Include subject/exam in chat context
- [ ] Update AI prompts with subject awareness
- [ ] Test: Vidya knows current subject

#### 4. `components/RapidRecall.tsx` (MODIFY)

- [ ] Import `useFilteredScans`
- [ ] Filter flashcards by subject
- [ ] Apply subject theming
- [ ] Test: Flashcards filter correctly

#### 5. `components/TrainingStudio.tsx` (MODIFY)

- [ ] Import `useAppContext`
- [ ] Filter trainings by subject
- [ ] Apply subject theming
- [ ] Test: Trainings filter correctly

### Testing Phase 4

- [ ] All components respect active subject
- [ ] Switching subject updates all views
- [ ] No data leakage between subjects
- [ ] Theme colors consistent across app

**Commit:**
```bash
git add .
git commit -m "Phase 4: Update all components for subject awareness"
```

---

## Phase 5: Polish & Optimization (Days 12-13)

### Goal
Add loading states, optimize performance, add analytics.

### Tasks

- [ ] Add loading spinner during subject switch
- [ ] Add transition animations for subject change
- [ ] Memoize expensive computations
  - [ ] Wrap filtered lists with React.memo
  - [ ] Optimize chart rendering
- [ ] Add analytics tracking
  - [ ] Track subject switches
  - [ ] Track upload events with subject/exam
  - [ ] Track time spent per subject
- [ ] Add keyboard shortcuts
  - [ ] Ctrl+1/2/3/4 to switch subjects
  - [ ] Ctrl+E to switch exam
- [ ] Add tooltips and help text
  - [ ] Subject switcher tooltips
  - [ ] Empty state help text
- [ ] Performance audit
  - [ ] Check bundle size
  - [ ] Check re-render count
  - [ ] Check memory usage

### Testing Phase 5

- [ ] Smooth animations, no jank
- [ ] No unnecessary re-renders
- [ ] Bundle size increase <50KB
- [ ] Analytics events firing correctly

**Commit:**
```bash
git add .
git commit -m "Phase 5: Add polish and performance optimizations"
```

---

## Phase 6: Testing & Documentation (Days 14-15)

### Goal
Comprehensive testing and final documentation.

### Testing Tasks

#### Manual Testing

- [ ] Test all subject combinations
  - [ ] Math + KCET
  - [ ] Math + JEE
  - [ ] Math + CBSE
  - [ ] Physics + KCET
  - [ ] Physics + NEET
  - [ ] Physics + JEE
  - [ ] Physics + CBSE
  - [ ] Chemistry + KCET
  - [ ] Chemistry + NEET
  - [ ] Chemistry + JEE
  - [ ] Chemistry + CBSE
  - [ ] Biology + KCET
  - [ ] Biology + NEET
  - [ ] Biology + CBSE

- [ ] Test edge cases
  - [ ] Switch subject during file upload
  - [ ] Switch subject during processing
  - [ ] Refresh page mid-switch
  - [ ] Clear localStorage and reload
  - [ ] Upload 100+ scans, verify performance

- [ ] Test error handling
  - [ ] Upload with invalid examContext (should fail)
  - [ ] Switch to invalid subject-exam combo (should auto-correct)
  - [ ] Redis connection failure (should show error)

#### Browser Testing

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Documentation Tasks

- [ ] Update main README.md
  - [ ] Add subject switching section
  - [ ] Add screenshots
- [ ] Create video walkthrough (optional)
- [ ] Update API documentation
- [ ] Create troubleshooting guide

### Deliverables

- [ ] Test report document
- [ ] Updated README
- [ ] Deployment guide
- [ ] Migration runbook

**Commit:**
```bash
git add .
git commit -m "Phase 6: Final testing and documentation"
```

---

## Pre-Deployment

### Checklist

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No console errors in production build
- [ ] Performance metrics acceptable
- [ ] Documentation complete
- [ ] Migration script tested on staging data
- [ ] Rollback plan documented

### Build & Deploy

```bash
# Build production bundle
npm run build

# Run migration on production Redis
node scripts/migrateExamContext.js

# Deploy frontend
# (deployment commands specific to your hosting)

# Restart backend
pm2 restart edujourney-server

# Monitor logs
pm2 logs
```

---

## Post-Deployment

### Monitoring (First 24 Hours)

- [ ] Check error logs every 2 hours
- [ ] Monitor API response times
- [ ] Track subject switch events
- [ ] Verify uploads include examContext
- [ ] Check user feedback channels

### Metrics to Track

- [ ] API error rate (<1%)
- [ ] Page load time (<3s)
- [ ] Subject switch time (<200ms)
- [ ] Upload success rate (>99%)
- [ ] User retention (no drop)

---

## Rollback Procedure (If Needed)

### Severity Level 1: Critical (Immediate Rollback)

**Symptoms:**
- App crashes on load
- Data corruption
- Cannot upload scans

**Action:**
```bash
# Revert commits
git revert HEAD~10..HEAD

# Restore Redis backup
redis-cli SHUTDOWN
cp /backup/dump_YYYYMMDD.rdb /var/lib/redis/dump.rdb
redis-server &

# Rebuild and deploy
npm run build
pm2 restart all
```

### Severity Level 2: High (24h Window)

**Symptoms:**
- Subject switching doesn't work
- Performance degradation >50%

**Action:**
- Fix forward if possible
- Otherwise follow Level 1 rollback

### Severity Level 3: Medium (Fix Forward)

**Symptoms:**
- UI glitches
- Minor filtering issues

**Action:**
- Create hotfix branch
- Deploy patch

---

## Success Criteria

### Must Have (Blocker if not met)

- [x] User can switch between all 4 subjects
- [x] Scans filter by subject and exam correctly
- [x] Empty states show when no scans
- [x] Theme colors update on subject switch
- [x] localStorage persists preferences
- [x] All existing features work unchanged
- [x] Zero data loss during migration

### Should Have (Fix in v1.1)

- [ ] Keyboard shortcuts for subject switching
- [ ] Analytics tracking implemented
- [ ] Performance optimized (<200ms switch)

### Nice to Have (Future)

- [ ] Subject comparison view
- [ ] Cross-subject analytics
- [ ] Subject-specific AI models

---

## Files Changed Summary

### New Files (10)
1. `config/subjects.ts`
2. `config/exams.ts`
3. `contexts/AppContext.tsx`
4. `hooks/useFilteredScans.ts`
5. `hooks/useSubjectTheme.ts`
6. `components/SubjectSwitcher.tsx`
7. `components/EmptyState.tsx`
8. `scripts/migrateExamContext.js`
9. `tests/AppContext.test.tsx` (optional)
10. `tests/useFilteredScans.test.ts` (optional)

### Modified Files (10)
1. `types.ts`
2. `App.tsx`
3. `index.css`
4. `server.js`
5. `components/Sidebar.tsx`
6. `components/BoardMastermind.tsx`
7. `components/ExamAnalysis.tsx`
8. `components/VisualQuestionBank.tsx`
9. `components/VidyaV3.tsx`
10. `README.md`

**Total:** 20 files

---

## Time Estimate

| Phase | Duration | Effort |
|-------|----------|--------|
| Phase 1: Foundation | 2-3 days | 16-24 hours |
| Phase 2: UI Components | 2-3 days | 16-24 hours |
| Phase 3: Backend | 1-2 days | 8-16 hours |
| Phase 4: Feature Complete | 2-3 days | 16-24 hours |
| Phase 5: Polish | 1-2 days | 8-16 hours |
| Phase 6: Testing | 1-2 days | 8-16 hours |
| **Total** | **10-15 days** | **72-120 hours** |

---

## Notes

- Work incrementally, test after each file change
- Commit frequently with descriptive messages
- Keep feature branch in sync with main
- Document any deviations from plan
- Ask for help if blocked >4 hours

---

**Last Updated:** 2026-01-31
**Version:** 1.0
**Status:** Ready for Implementation
