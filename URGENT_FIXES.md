# URGENT FIXES REQUIRED

## Summary of Issues from Screenshots

### 1. Graph Display Issues ❌

**Longitudinal Cognitive Drift**:
- Shows only dashed line
- No data points visible
- Likely cause: portfolioStats is null or has insufficient data

**Cognitive Balance Index**:
- Shows flat/minimal lines
- Not showing variation between papers
- Needs data validation

**Rigor Segmentation**:
- Shows only orange bars (all same difficulty)
- Not showing Easy/Moderate/Hard distribution
- Difficulty calculation issue

### 2. Sketch Notes - No Vault Selection ❌
- Shows "NO SKETCHES SYNTHESIZED"
- Missing: Dropdown to select which analysis/vault to use
- User can't choose which paper's sketches to view

### 3. Question Bank - Incomplete UI ❌
- Shows "VAULT OFFLINE"
- Missing:
  - Subject selector
  - Class selector
  - Vault analysis dropdown
  - Number of questions input
  - Generate button

### 4. Caching Not Implemented ❌
- Generated sketches not cached
- Flashcards regenerated every time
- No persistence for AI-generated content
- Slow performance

---

## IMPLEMENTATION PRIORITY

### PHASE 1: Critical Fixes (Do First)

#### 1.1 Add Vault Selection to Sketch Notes
**File**: `components/SketchGallery.tsx`
**Changes**:
```typescript
// Add prop to receive recentScans
interface SketchGalleryProps {
  onBack?: () => void;
  scan?: Scan | null;
  onUpdateScan?: (scan: Scan) => void;
  recentScans?: Scan[]; // ADD THIS
}

// Add state for selected vault scan
const [selectedVaultScan, setSelectedVaultScan] = useState<Scan | null>(scan);

// Add dropdown in header
<select
  value={selectedVaultScan?.id || ''}
  onChange={(e) => {
    const selected = recentScans?.find(s => s.id === e.target.value);
    setSelectedVaultScan(selected || null);
  }}
  className="..."
>
  <option value="">Select Analysis from Vault</option>
  {recentScans?.map(scan => (
    <option key={scan.id} value={scan.id}>
      {scan.name} - {scan.subject} {scan.grade}
    </option>
  ))}
</select>

// Use selectedVaultScan instead of scan for rendering
const scanQuestions = selectedVaultScan?.analysisData?.questions || [];
```

#### 1.2 Fix Graph Data Display
**File**: `components/ExamAnalysis.tsx`
**Issues to Fix**:

1. **Longitudinal Cognitive Drift**: Add fallback when portfolioStats is null
2. **Cognitive Balance Index**: Ensure data has variation
3. **Rigor Segmentation**: Fix difficulty percentage calculation

**Changes**:
```typescript
// Add better fallback for single-paper case
{portfolioStats && portfolioStats.length > 1 ? (
  // Show multi-paper charts
) : (
  // Show single-paper summary
  <div className="text-center p-8">
    <p>Add more papers to see longitudinal trends</p>
    <div className="grid grid-cols-3 gap-4 mt-6">
      <MetricCard title="Math Intensity" content={`${mathIntensity}%`} />
      <MetricCard title="Depth Factor" content={`${depthFactor}%`} />
      <MetricCard title="Avg Difficulty" content={avgDifficulty.toFixed(1)} />
    </div>
  </div>
)}
```

#### 1.3 Complete Question Bank UI
**File**: `components/VisualQuestionBank.tsx`
**Add Complete Selection Interface**:

```typescript
const [selectedClass, setSelectedClass] = useState('Class 12');
const [selectedSubject, setSelectedSubject] = useState('Physics');
const [selectedAnalysis, setSelectedAnalysis] = useState<Scan | null>(null);
const [numQuestions, setNumQuestions] = useState(20);

// Filter vault by class and subject
const filteredVault = recentScans.filter(s => 
  s.grade === selectedClass && s.subject === selectedSubject
);

// UI
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <select value={selectedClass} onChange={...}>
    <option>Class 10</option>
    <option>Class 12</option>
  </select>
  
  <select value={selectedSubject} onChange={...}>
    <option>Physics</option>
    <option>Chemistry</option>
    <option>Biology</option>
    <option>Math</option>
  </select>
  
  <select value={selectedAnalysis?.id || ''} onChange={...}>
    <option value="">Select Vault Analysis</option>
    {filteredVault.map(scan => (
      <option key={scan.id} value={scan.id}>
        {scan.name}
      </option>
    ))}
  </select>
  
  <input
    type="number"
    value={numQuestions}
    onChange={(e) => setNumQuestions(Number(e.target.value))}
    min={5}
    max={50}
    placeholder="# Questions"
  />
</div>

<button
  onClick={generatePaper}
  disabled={!selectedAnalysis}
  className="..."
>
  Generate Similar Paper
</button>
```

### PHASE 2: Caching System

#### 2.1 Create Cache Utility
**File**: `utils/cache.ts` (NEW)

```typescript
interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  scanId: string;
  type: 'sketch' | 'flashcard' | 'question' | 'synthesis';
}

const CACHE_PREFIX = 'edujourney_';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export const cache = {
  save(key: string, data: any, scanId: string, type: string) {
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      scanId,
      type
    };
    try {
      localStorage.setItem(
        `${CACHE_PREFIX}${key}`,
        JSON.stringify(entry)
      );
    } catch (e) {
      console.warn('Cache save failed:', e);
    }
  },

  get(key: string): any | null {
    try {
      const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!item) return null;
      
      const entry: CacheEntry = JSON.parse(item);
      if (Date.now() - entry.timestamp > CACHE_EXPIRY) {
        this.remove(key);
        return null;
      }
      
      return entry.data;
    } catch (e) {
      return null;
    }
  },

  remove(key: string) {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  },

  clearAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
  },

  getByScan(scanId: string): CacheEntry[] {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX))
      .map(k => {
        try {
          return JSON.parse(localStorage.getItem(k)!);
        } catch {
          return null;
        }
      })
      .filter(e => e && e.scanId === scanId);
  }
};
```

#### 2.2 Use Cache in Components

**SketchGallery.tsx**:
```typescript
import { cache } from '../utils/cache';

// Before generating
const cacheKey = `sketch_${scan.id}_${q.id}`;
const cached = cache.get(cacheKey);
if (cached) {
  // Use cached diagram
  return cached;
}

// After generating
cache.save(cacheKey, svgCode, scan.id, 'sketch');
```

**RapidRecall.tsx**:
```typescript
// Before generating flashcards
const cacheKey = `flashcards_${scanId}`;
const cached = cache.get(cacheKey);
if (cached) {
  setFlashcards(cached);
  return;
}

// After generating
cache.save(cacheKey, flashcards, scanId, 'flashcard');
```

---

## TESTING CHECKLIST

### After Phase 1:
- [ ] Sketch Notes shows vault dropdown
- [ ] Can select different analyses
- [ ] Graphs show data or helpful message
- [ ] Question Bank has all 4 selectors
- [ ] Question Bank filters vault by class/subject

### After Phase 2:
- [ ] Generated sketches persist across refreshes
- [ ] Flashcards load instantly from cache
- [ ] Cache expires after 7 days
- [ ] Can clear cache manually

---

## FILES TO MODIFY

1. `components/SketchGallery.tsx` - Add vault selection
2. `components/ExamAnalysis.tsx` - Fix graph fallbacks
3. `components/VisualQuestionBank.tsx` - Complete UI
4. `components/RapidRecall.tsx` - Add caching
5. `utils/cache.ts` - NEW - Cache utility
6. `App.tsx` - Pass recentScans to SketchGallery

---

## ESTIMATED TIME
- Phase 1: 30-45 minutes
- Phase 2: 20-30 minutes
- Total: ~1 hour

Let's start with Phase 1!
