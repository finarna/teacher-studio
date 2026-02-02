# Multi-Subject Architecture - Quick Reference Guide

**Quick navigation guide for developers implementing the multi-subject system.**

---

## Component Hierarchy

```
App (wrapped in AppContextProvider)
├── SubjectSwitcher (global subject/exam selector)
├── Sidebar (subject badge + themed active items)
└── Main Content
    ├── BoardMastermind (filtered scans)
    ├── ExamAnalysis (themed charts)
    ├── VisualQuestionBank (filtered questions)
    ├── SketchGallery (filtered sketches)
    ├── RapidRecall (subject-specific flashcards)
    └── VidyaV3 (subject-aware chat context)
```

---

## Usage Patterns

### 1. Using AppContext in Components

```typescript
import { useAppContext } from '../contexts/AppContext';

const MyComponent = () => {
  const { activeSubject, activeExamContext, subjectConfig, examConfig } = useAppContext();

  return (
    <div>
      <p>Current: {subjectConfig.displayName} ({examConfig.name})</p>
    </div>
  );
};
```

### 2. Filtering Scans by Subject

```typescript
import { useFilteredScans } from '../hooks/useFilteredScans';

const MyComponent = ({ allScans }: { allScans: Scan[] }) => {
  const { scans, hasScans, count } = useFilteredScans(allScans);

  if (!hasScans) {
    return <EmptyState />;
  }

  return (
    <div>
      {scans.map(scan => <ScanCard key={scan.id} scan={scan} />)}
    </div>
  );
};
```

### 3. Using Subject Theme Colors

```typescript
import { useSubjectTheme } from '../hooks/useSubjectTheme';

const MyComponent = () => {
  const theme = useSubjectTheme();

  return (
    <div style={{
      backgroundColor: theme.colorLight,
      color: theme.colorDark
    }}>
      {theme.iconEmoji} Content
    </div>
  );
};
```

### 4. Switching Subject/Exam

```typescript
const { setActiveSubject, setActiveExamContext, switchContext } = useAppContext();

// Option 1: Switch subject only (exam auto-adjusts if needed)
setActiveSubject('Physics');

// Option 2: Switch exam only (validates with current subject)
setActiveExamContext('NEET');

// Option 3: Switch both atomically
switchContext('Chemistry', 'NEET');
```

### 5. Creating Subject-Aware Upload

```typescript
const { activeSubject, activeExamContext } = useAppContext();

const handleUpload = async (file: File) => {
  const scan: Scan = {
    id: generateId(),
    name: file.name,
    subject: activeSubject,      // From context
    examContext: activeExamContext, // From context
    grade: 'Class 12',
    // ... rest of scan data
  };

  await uploadScan(scan);
};
```

---

## Subject Configurations

### Available Subjects

| Subject | Color | Icon | Exams |
|---------|-------|------|-------|
| Math | Blue (#3B82F6) | Calculator 🧮 | KCET, JEE, CBSE |
| Physics | Green (#10B981) | Atom ⚛️ | KCET, NEET, JEE, CBSE |
| Chemistry | Purple (#8B5CF6) | Flask ⚗️ | KCET, NEET, JEE, CBSE |
| Biology | Amber (#F59E0B) | Leaf 🌿 | KCET, NEET, CBSE |

### Accessing Config

```typescript
import { SUBJECT_CONFIGS } from '../config/subjects';

const mathConfig = SUBJECT_CONFIGS['Math'];
console.log(mathConfig.color); // '#3B82F6'
console.log(mathConfig.domains); // ['Algebra', 'Calculus', ...]
```

---

## Exam Configurations

### Available Exams

| Exam | Full Name | Subjects | Questions | Marks | Time |
|------|-----------|----------|-----------|-------|------|
| KCET | Karnataka CET | All 4 | 60 | 1 each | 80 min |
| NEET | NEET | Phy, Chem, Bio | 45 | 4 each (-1) | 180 min |
| JEE | JEE Main | Math, Phy, Chem | 30 | 4 each (-1) | 180 min |
| CBSE | CBSE Board | All 4 | 40 | 1 each | 180 min |

### Accessing Config

```typescript
import { EXAM_CONFIGS } from '../config/exams';

const kcetConfig = EXAM_CONFIGS['KCET'];
console.log(kcetConfig.pattern.totalQuestions); // 60
console.log(kcetConfig.applicableSubjects); // ['Math', 'Physics', ...]
```

---

## Common Patterns

### Pattern 1: Subject-Specific Empty State

```typescript
import EmptyState from '../components/EmptyState';
import { useFilteredScans } from '../hooks/useFilteredScans';

const MyView = ({ scans }) => {
  const { scans: filtered, hasScans } = useFilteredScans(scans);

  if (!hasScans) {
    return <EmptyState onUpload={handleUpload} />;
  }

  return <div>{/* Show content */}</div>;
};
```

### Pattern 2: Dynamic Chart Colors

```typescript
import { useSubjectTheme } from '../hooks/useSubjectTheme';

const ChartComponent = ({ data }) => {
  const theme = useSubjectTheme();

  const chartData = data.map(item => ({
    ...item,
    color: theme.color // Dynamic color based on subject
  }));

  return <BarChart data={chartData} />;
};
```

### Pattern 3: Conditional Rendering by Subject

```typescript
const { activeSubject } = useAppContext();

return (
  <div>
    {activeSubject === 'Math' && <CalculusTools />}
    {activeSubject === 'Physics' && <CircuitSimulator />}
    {activeSubject === 'Chemistry' && <MolecularViewer />}
    {activeSubject === 'Biology' && <AnatomyDiagram />}
  </div>
);
```

### Pattern 4: Subject Stats Display

```typescript
import { useSubjectStats } from '../hooks/useFilteredScans';

const StatsCard = ({ scans }) => {
  const stats = useSubjectStats(scans);

  return (
    <div>
      <p>Papers: {stats.totalScans}</p>
      <p>Questions: {stats.totalQuestions}</p>
      <p>Topics: {stats.uniqueTopics}</p>
      <p>Avg Q/Paper: {stats.averageQuestionsPerScan}</p>
    </div>
  );
};
```

---

## CSS Variables for Theming

The subject theme automatically updates these CSS variables:

```css
:root {
  --subject-primary: #3B82F6;   /* Changes based on active subject */
  --subject-light: #DBEAFE;     /* Light variant for backgrounds */
  --subject-dark: #1E40AF;      /* Dark variant for text */
}

/* Usage in components */
.subject-badge {
  background-color: var(--subject-light);
  color: var(--subject-dark);
  border: 2px solid var(--subject-primary);
}

.active-item {
  box-shadow: 0 0 20px var(--subject-primary);
}
```

---

## API Integration

### Uploading Scan with Context

```typescript
const response = await fetch('/api/scans', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: scanId,
    subject: 'Physics',
    examContext: 'KCET',  // Required field
    grade: 'Class 12',
    analysisData: { ... }
  })
});
```

### Fetching Filtered Scans

```typescript
// Option 1: Filter on server
const response = await fetch('/api/scans?subject=Physics&examContext=KCET');
const scans = await response.json();

// Option 2: Filter on client (recommended for speed)
const response = await fetch('/api/scans');
const allScans = await response.json();
const { scans } = useFilteredScans(allScans);
```

### Getting Subject Statistics

```typescript
const response = await fetch('/api/stats/subjects');
const stats = await response.json();

console.log(stats.Physics.scans);      // Number of Physics papers
console.log(stats.Physics.questions);  // Total Physics questions
console.log(stats.Physics.exams);      // Breakdown by exam: { KCET: 10, NEET: 5 }
```

---

## Validation Rules

### Subject-Exam Compatibility

```typescript
import { EXAM_CONFIGS } from '../config/exams';

const isValid = (subject: Subject, exam: ExamContext): boolean => {
  return EXAM_CONFIGS[exam].applicableSubjects.includes(subject);
};

// Examples:
isValid('Math', 'KCET');    // ✅ true
isValid('Math', 'NEET');    // ❌ false (NEET doesn't have Math)
isValid('Biology', 'NEET'); // ✅ true
isValid('Biology', 'JEE');  // ❌ false (JEE doesn't have Biology)
```

### Auto-Correction on Invalid Combinations

When switching to a subject that doesn't support the current exam:

```typescript
const setActiveSubject = (newSubject: Subject) => {
  // Check if current exam supports new subject
  if (!isValidCombination(newSubject, activeExamContext)) {
    // Auto-switch to first valid exam for this subject
    const validExam = SUBJECT_CONFIGS[newSubject].examContexts[0];
    setActiveExamContextState(validExam);
  }
  setActiveSubjectState(newSubject);
};
```

---

## localStorage Schema

```json
{
  "edujourney_preferences": {
    "defaultSubject": "Physics",
    "defaultExamContext": "KCET",
    "lastActiveSubject": "Physics",
    "lastActiveExam": "KCET",
    "timestamp": 1738329600000
  }
}
```

Access via:
```typescript
const prefs = JSON.parse(localStorage.getItem('edujourney_preferences'));
```

---

## Common Gotchas

### 1. ❌ Don't use context outside provider

```typescript
// ❌ Wrong - will throw error
const MyComponent = () => {
  const { activeSubject } = useAppContext();
  return <div>{activeSubject}</div>;
};

// ✅ Correct - wrapped in provider
<AppContextProvider>
  <MyComponent />
</AppContextProvider>
```

### 2. ❌ Don't filter scans manually

```typescript
// ❌ Wrong - duplicates filtering logic
const filtered = scans.filter(s => s.subject === activeSubject);

// ✅ Correct - use hook
const { scans: filtered } = useFilteredScans(scans);
```

### 3. ❌ Don't hardcode colors

```typescript
// ❌ Wrong - breaks theme switching
<div style={{ color: '#3B82F6' }}>Physics</div>

// ✅ Correct - use theme hook
const theme = useSubjectTheme();
<div style={{ color: theme.color }}>Physics</div>
```

### 4. ❌ Don't forget examContext on new scans

```typescript
// ❌ Wrong - missing examContext
const scan = {
  subject: 'Physics',
  grade: 'Class 12'
};

// ✅ Correct - includes examContext
const scan = {
  subject: 'Physics',
  examContext: 'KCET',
  grade: 'Class 12'
};
```

---

## Testing Checklist

Before deploying changes:

- [ ] Upload scan with active subject/exam → saves correctly
- [ ] Switch subject → scans filter immediately
- [ ] Switch exam → invalid subjects handled gracefully
- [ ] Refresh page → last subject/exam restored
- [ ] No scans for subject → empty state shows
- [ ] Theme colors update on subject switch
- [ ] Charts use dynamic subject colors
- [ ] localStorage updates on each switch
- [ ] Mobile responsive subject switcher
- [ ] Keyboard navigation works

---

## Performance Tips

### 1. Memoize Filtered Scans

```typescript
const { scans } = useFilteredScans(allScans);
// Internally uses useMemo - won't re-filter unless scans/subject changes
```

### 2. Lazy Load Subject-Specific Components

```typescript
const PhysicsTools = lazy(() => import('./PhysicsTools'));
const ChemistryTools = lazy(() => import('./ChemistryTools'));

{activeSubject === 'Physics' && <Suspense><PhysicsTools /></Suspense>}
```

### 3. Debounce localStorage Writes

Already implemented in AppContext - localStorage writes are debounced to 500ms.

---

## Troubleshooting

### Issue: Context returns undefined

**Cause:** Component not wrapped in AppContextProvider

**Solution:**
```typescript
// In App.tsx
<AppContextProvider>
  {/* All app content here */}
</AppContextProvider>
```

### Issue: Scans not filtering

**Cause:** Using raw scans instead of filtered hook

**Solution:**
```typescript
const { scans: filtered } = useFilteredScans(rawScans);
return <div>{filtered.map(...)}</div>;
```

### Issue: Theme colors not updating

**Cause:** Not using CSS variables or theme hook

**Solution:**
```typescript
const theme = useSubjectTheme();
style={{ backgroundColor: theme.colorLight }}
```

### Issue: Invalid subject-exam combination error

**Cause:** Trying to set invalid combination (e.g., Math + NEET)

**Solution:** Use `switchContext()` or rely on auto-correction in `setActiveSubject()`

---

## Quick Command Reference

```bash
# Install dependencies (none needed - uses existing)
npm install

# Run development server
npm run dev:all

# Run migration script
node scripts/migrateExamContext.js

# Build for production
npm run build

# Run tests (once implemented)
npm test
```

---

## Resources

- **Main Documentation:** [MULTI_SUBJECT_ARCHITECTURE.md](./MULTI_SUBJECT_ARCHITECTURE.md)
- **Subject Configs:** `config/subjects.ts`
- **Exam Configs:** `config/exams.ts`
- **AppContext:** `contexts/AppContext.tsx`
- **Type Definitions:** `types.ts`

---

**Last Updated:** 2026-01-31
**Version:** 1.0
