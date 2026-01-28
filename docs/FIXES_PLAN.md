# Implementation Plan - Fixes & Enhancements

## 1. Graph Issues Analysis

### Longitudinal Cognitive Drift
**Problem**: Only shows dashed line, no data points
**Cause**: Likely missing data or incorrect data structure
**Fix**: Check portfolioStats data and ensure depthFactor/mathIntensity have values

### Cognitive Balance Index  
**Problem**: Shows flat lines
**Cause**: Data points not varying or missing
**Fix**: Verify mathIntensity and depthFactor calculations

### Rigor Segmentation
**Problem**: Shows only orange bars (all same)
**Cause**: Difficulty distribution not calculated correctly
**Fix**: Check diffEasy, diffModerate, diffCritical percentages

---

## 2. Caching System for Generated Content

### What to Cache:
- **Sketch Notes** (SVG diagrams)
- **Flashcards** (from Rapid Recall)
- **Question Bank** (generated papers)
- **Analysis Results** (synthesis data)

### Implementation Strategy:

#### A. Local Storage Cache
```typescript
interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  scanId: string;
  type: 'sketch' | 'flashcard' | 'question' | 'synthesis';
}

const CACHE_KEY_PREFIX = 'edujourney_cache_';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

function saveToCache(key: string, data: any, scanId: string, type: string) {
  const entry: CacheEntry = {
    key,
    data,
    timestamp: Date.now(),
    scanId,
    type
  };
  localStorage.setItem(`${CACHE_KEY_PREFIX}${key}`, JSON.stringify(entry));
}

function getFromCache(key: string): any | null {
  const item = localStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
  if (!item) return null;
  
  const entry: CacheEntry = JSON.parse(item);
  if (Date.now() - entry.timestamp > CACHE_EXPIRY) {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
    return null;
  }
  
  return entry.data;
}
```

#### B. Redis Cache (Server-side)
Already have Redis connection in server.js - extend it:

```javascript
// Save generated content
app.post('/api/cache/save', async (req, res) => {
  const { key, data, scanId, type } = req.body;
  await redis.setex(
    `cache:${key}`,
    604800, // 7 days
    JSON.stringify({ data, scanId, type, timestamp: Date.now() })
  );
  res.json({ success: true });
});

// Retrieve cached content
app.get('/api/cache/:key', async (req, res) => {
  const cached = await redis.get(`cache:${req.params.key}`);
  res.json(cached ? JSON.parse(cached) : null);
});
```

---

## 3. Sketch Notes - Vault Selection UI

### Current Problem:
- No way to select which analysis/vault to use
- Shows "NO SKETCHES SYNTHESIZED"

### Solution:
Add vault selector dropdown in SketchGallery header:

```typescript
const [selectedVaultScan, setSelectedVaultScan] = useState<Scan | null>(scan);

// In header section:
<select
  value={selectedVaultScan?.id || ''}
  onChange={(e) => {
    const selected = recentScans.find(s => s.id === e.target.value);
    setSelectedVaultScan(selected || null);
  }}
  className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold"
>
  <option value="">Select Analysis from Vault</option>
  {recentScans.map(scan => (
    <option key={scan.id} value={scan.id}>
      {scan.name} - {scan.subject} {scan.grade}
    </option>
  ))}
</select>
```

---

## 4. Question Bank - Complete UI

### Missing Elements:
- Subject selector
- Class selector  
- Vault analysis selector
- Number of questions input
- Generate button

### Implementation:

```typescript
// VisualQuestionBank.tsx
const [selectedClass, setSelectedClass] = useState('Class 12');
const [selectedSubject, setSelectedSubject] = useState('Physics');
const [selectedAnalysis, setSelectedAnalysis] = useState<Scan | null>(null);
const [numQuestions, setNumQuestions] = useState(20);
const [generatedPaper, setGeneratedPaper] = useState<any>(null);

// UI Layout:
<div className="space-y-6">
  {/* Selection Controls */}
  <div className="grid grid-cols-4 gap-4">
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
    
    <select value={selectedAnalysis?.id} onChange={...}>
      <option value="">Select Vault Analysis</option>
      {recentScans
        .filter(s => s.subject === selectedSubject && s.grade === selectedClass)
        .map(scan => (
          <option key={scan.id} value={scan.id}>
            {scan.name}
          </option>
        ))
      }
    </select>
    
    <input
      type="number"
      value={numQuestions}
      onChange={(e) => setNumQuestions(Number(e.target.value))}
      min={5}
      max={50}
      placeholder="Number of Questions"
    />
  </div>
  
  <button onClick={generatePaper}>
    Generate Similar Paper
  </button>
</div>
```

---

## Priority Implementation Order:

1. **Fix Graphs** (High - visual bugs)
2. **Add Vault Selection to Sketch Notes** (High - broken UX)
3. **Implement Caching System** (High - performance)
4. **Complete Question Bank UI** (Medium - new feature)

---

## Next Steps:

1. Analyze graph data structure and fix calculations
2. Add vault selector to SketchGallery
3. Implement caching utilities
4. Build complete Question Bank interface
