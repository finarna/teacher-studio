# KCET Math Flagship Generation - Flow Verification

**Date:** 2026-04-15
**Status:** ✅ VERIFIED
**Script:** `scripts/oracle/generate_flagship_oracle.ts`

---

## 📊 Complete Generation Flow

### STEP 1: Fetch Forecasted Calibration from Database
**File:** `lib/reiEvolutionEngine.ts` → `getForecastedCalibration()`

**Data Sources (in priority order):**
1. ✅ `ai_universal_calibration` table (if exists) - Master override
2. ✅ `exam_historical_patterns` table - Historical patterns (2021-2025)
3. ✅ `rei_evolution_configs` table - Calibrated engine parameters
4. ✅ Baseline profile (fallback) - KCET default: 33% Easy, 42% Moderate, 25% Hard

**What's Retrieved:**
```javascript
{
  examContext: "KCET",
  subject: "Math",
  targetYear: 2026,

  // From rei_evolution_configs
  rigorVelocity: 1.6817,
  idsTarget: 0.8942,

  // Calculated from exam_historical_patterns
  difficultyProfile: {
    easy: 37,      // Calculated based on trend
    moderate: 48,
    hard: 15
  },

  // From rei_evolution_configs
  intentSignature: {
    synthesis: 0.294,
    trapDensity: 0.30,
    linguisticLoad: 0.25,
    speedRequirement: 1.12
  },

  // From exam_historical_patterns (most recent)
  boardSignature: "SYNTHESIZER",

  directives: [
    "Peak synthesis complexity...",
    "Target IDS: 0.8942",
    "Rigor Target: 1.6817x"
  ]
}
```

**Difficulty Calculation Logic:**
```typescript
// Line 139: Calculate year-over-year drift
const rigorDrift = (recent.difficulty_hard_pct ?? 20) - (previous.difficulty_hard_pct ?? 20);
// With current data: 0% - 0% = 0%

// Line 159: Forecast hard percentage for 2026
const forecastedHard = Math.min(65, Math.max(15,
  (recent.difficulty_hard_pct ?? 20) + (rigorDrift * driftMultiplier)
));
// = max(15, 0 + (0 × 1.6817)) = max(15, 0) = 15%

// Line 161: Split remaining percentage using KCET baseline ratio (33:42)
const remaining = 100 - 15 = 85;
const forecastedEasy = Math.round(85 × (33/75)) = Math.round(37.4) = 37%;
const forecastedModerate = 100 - 15 - 37 = 48%;
```

---

### STEP 2: Load Identity Bank from JSON File
**File:** `lib/oracle/identities/kcet_math.json`

**What's Loaded:**
```javascript
{
  version: "REI v16.17",
  subject: "Math",
  exam: "KCET",
  identities: [
    {
      id: "MAT-001",
      name: "Set Theory De-Morgan",
      topic: "Sets",
      confidence: 0.99,      // ✅ Calibrated
      high_yield: false,
      logic_cluster: "CORE_LOGIC"    // Used for SET A/B differentiation
    },
    // ... 29 more identities
  ],
  calibration: {
    status: "CALIBRATED_2021_2025",
    updated_at: "2026-04-14T...",
    final_match_rate: 0.792,
    total_iterations: 7
  }
}
```

**Key Stats:**
- Total Identities: 30
- High-Confidence (≥75%): 15
- Logic Clusters: 2 (CORE_LOGIC, PERIPHERAL_LOGIC)
  - SET A uses CORE_LOGIC cluster
  - SET B uses PERIPHERAL_LOGIC cluster

---

### STEP 3: Construct Payload for Question Generation
**File:** `scripts/oracle/generate_flagship_oracle.ts` (Lines 63-87)

**Payload Structure:**
```javascript
{
  // Basic Config
  userId: "13282202-5251-4c94-b5ef-95c273378262",  // Admin user
  testName: "PLUS2AI OFFICIAL MATH PREDICTION 2026: SET_A",
  subject: "Math",
  examContext: "KCET",
  topicIds: [],              // Empty = full syllabus
  questionCount: 60,
  durationMinutes: 80,
  saveAsTemplate: false,
  strategyMode: "predictive_mock",

  // Difficulty Mix (normalized)
  difficultyMix: {
    easy: 37,      // ✅ From forecast
    moderate: 48,
    hard: 15
  },

  // Oracle Mode (AI instructions)
  oracleMode: {
    enabled: true,
    idsTarget: 0.8942,           // ✅ High cognitive demand
    rigorVelocity: 1.6817,       // ✅ Difficulty multiplier
    boardSignature: "SYNTHESIZER", // ✅ Question style

    intentSignature: {
      synthesis: 0.294,           // ✅ Property-based fusion
      trapDensity: 0.30,          // ✅ Trap options
      linguisticLoad: 0.25,       // ✅ Language complexity
      speedRequirement: 1.12      // ✅ Time pressure
    },

    directives: [
      "Peak synthesis complexity...",
      "Target IDS: 0.8942",
      "Rigor Target: 1.6817x",
      "FORENSIC_FOCUS: CORE_LOGIC",    // ✅ SET A cluster
      "TARGET_SET: SET_A"
    ]
  }
}
```

**Normalization Function:**
```typescript
function normalizeMix(mix: { easy: number; moderate: number; hard: number }) {
  const total = (mix.easy || 0) + (mix.moderate || 0) + (mix.hard || 0);
  if (total === 100) return mix;  // Already normalized
  if (total === 0) return { easy: 40, moderate: 40, hard: 20 };  // Fallback

  // Proportional scaling to 100%
  const factor = 100 / total;
  return {
    easy: Math.round(mix.easy * factor),
    moderate: Math.round(mix.moderate * factor),
    hard: 100 - Math.round(mix.easy * factor) - Math.round(mix.moderate * factor)
  };
}
```

---

### STEP 4: Generate Questions via AI
**File:** `api/learningJourneyEndpoints.js` → `generateTestInBackground()`

**Process:**
1. Receives payload from Step 3
2. Calls AI question generator (Gemini API)
3. AI generates 60 questions based on:
   - Difficulty mix (37% Easy, 48% Moderate, 15% Hard)
   - IDS target (89.4% cognitive demand)
   - Synthesis weight (29.4%)
   - Identity bank (high-confidence identities)
   - Oracle directives (SYNTHESIZER style, CORE_LOGIC cluster)

**AI Prompt Includes:**
- "Generate KCET Math questions for 2026"
- "Target difficulty: 37% Easy, 48% Moderate, 15% Hard"
- "IDS Target: 89.4% (high cognitive demand)"
- "Use property-based shortcuts (synthesis: 29.4%)"
- "Focus on: Matrices, Probability, Calculus Applications"
- "Board Signature: SYNTHESIZER (multi-property integration)"
- "Logic Cluster: CORE_LOGIC (fundamental concepts)"

**Output:**
```javascript
{
  questions: [
    {
      text: "Question text...",
      options: ["A) ...", "B) ...", "C) ...", "D) ..."],
      correctAnswer: "A) ...",
      topic: "Matrices",
      difficulty: "Easy",
      identityId: "MAT-016",
      solution: "Step-by-step solution...",
      solutionSteps: ["Step 1", "Step 2", ...],
      conceptTags: ["Matrices", "Determinants"]
    },
    // ... 59 more questions
  ]
}
```

---

### STEP 5: Save to JSON Files
**File:** `scripts/oracle/generate_flagship_oracle.ts` (Lines 94-118)

**Output Files:**

**For Math:**
- SET A: `flagship_final.json`
- SET B: `flagship_final_b.json`

**For Other Subjects:**
- SET A: `flagship_{subject}_final.json`
- SET B: `flagship_{subject}_final_b.json`

**JSON Structure:**
```javascript
{
  "test_name": "PLUS2AI OFFICIAL MATH PREDICTION 2026: SET_A",
  "subject": "Math",
  "exam_context": "KCET",
  "total_questions": 60,
  "is_official": true,
  "setId": "SET_A",
  "test_config": {
    "questions": [
      // ... 60 generated questions
    ]
  }
}
```

**File Location:**
```
/Users/apple/FinArna/edujourney---universal-teacher-studio/flagship_final.json
/Users/apple/FinArna/edujourney---universal-teacher-studio/flagship_final_b.json
```

---

## ✅ VERIFICATION CHECKLIST

### Database Tables (Verified)
- ✅ `rei_evolution_configs` has calibrated parameters
  - rigor_drift_multiplier: 1.6817
  - ids_baseline: 0.8942
  - synthesis_weight: 0.294
  - trap_weight: 0.30

- ✅ `exam_historical_patterns` has difficulty percentages
  - 2021: 38% Easy, 60% Moderate, 2% Hard
  - 2022: 52% Easy, 48% Moderate, 0% Hard
  - 2023: 38% Easy, 60% Moderate, 2% Hard
  - 2024: 47% Easy, 53% Moderate, 0% Hard
  - 2025: 70% Easy, 30% Moderate, 0% Hard

### JSON Files (Verified)
- ✅ `lib/oracle/identities/kcet_math.json` exists
  - 30 identities
  - 15 high-confidence (≥75%)
  - Calibration status: CALIBRATED_2021_2025

### Code Flow (Verified)
- ✅ `getForecastedCalibration()` reads from database
- ✅ Difficulty calculation uses stored percentages
- ✅ Bug fix applied (|| changed to ??)
- ✅ Normalization function ensures 100% total
- ✅ Payload construction includes all parameters
- ✅ Oracle mode enabled with correct settings

---

## 🎯 EXPECTED RESULTS

When you run:
```bash
npx tsx scripts/oracle/generate_flagship_oracle.ts Math
```

**Console Output:**
```
💎 ANALYZING FORENSIC DATA FOR FLAGSHIP PUBLISH...
🧠 [MATH] BRAIN DATA: IDS=0.8942 | Rigor=1.6817
🎯 IDENTITY FOCUS: Set A=CORE_LOGIC | Set B=PERIPHERAL_LOGIC

📡 [STEP] Syncing Math SET_A flagship...
✅ [SUCCESS] Exported Math SET_A to flagship_final.json (60 Qs)

📡 [STEP] Syncing Math SET_B flagship...
✅ [SUCCESS] Exported Math SET_B to flagship_final_b.json (60 Qs)
```

**Generated Papers:**
- 60 questions each
- Difficulty: ~22 Easy, ~29 Moderate, ~9 Hard
- IDS: 89.4% (high cognitive demand)
- Synthesis: 29.4% (property-based fusion)
- Topics: Matrices, Probability, Calculus, Sets, etc.
- Style: SYNTHESIZER (multi-property integration)

---

## 🔍 VALIDATION TESTS

### Test 1: Difficulty Distribution
```javascript
const questions = result.questions;
const easy = questions.filter(q => q.difficulty === 'Easy').length;
const moderate = questions.filter(q => q.difficulty === 'Moderate').length;
const hard = questions.filter(q => q.difficulty === 'Hard').length;

console.log(`Easy: ${easy}/60 (${(easy/60*100).toFixed(1)}%)`);
console.log(`Moderate: ${moderate}/60 (${(moderate/60*100).toFixed(1)}%)`);
console.log(`Hard: ${hard}/60 (${(hard/60*100).toFixed(1)}%)`);

// Expected: ~37% Easy, ~48% Moderate, ~15% Hard
// Actual may vary slightly due to AI generation
```

### Test 2: Identity Coverage
```javascript
const identityIds = [...new Set(questions.map(q => q.identityId))];
console.log(`Unique identities: ${identityIds.length}`);
// Expected: 12-16 identities (based on historical trend)
```

### Test 3: High-Confidence Identity Usage
```javascript
const highConfIdentities = ['MAT-001', 'MAT-003', 'MAT-004', 'MAT-013', 'MAT-014', 'MAT-016', 'MAT-017', 'MAT-020', 'MAT-022', 'MAT-024'];
const highConfUsage = questions.filter(q => highConfIdentities.includes(q.identityId)).length;
console.log(`High-confidence identity usage: ${highConfUsage}/60 (${(highConfUsage/60*100).toFixed(1)}%)`);
// Expected: 70-80% (most questions use high-confidence identities)
```

---

## 🚨 POTENTIAL ISSUES & FIXES

### Issue 1: Total Difficulty ≠ 100%
**Cause:** Rounding errors in normalization
**Fix:** `normalizeMix()` function handles this (line 20)
```typescript
hard: 100 - Math.round(mix.easy * factor) - Math.round(mix.moderate * factor)
```

### Issue 2: IDS Target Not Applied
**Cause:** Oracle mode disabled or missing
**Fix:** Verify `oracleMode.enabled = true` (line 76)

### Issue 3: Wrong Difficulty Distribution
**Cause:** Database not updated or bug in calculation
**Fix:**
- Verify difficulty percentages in database
- Verify bug fix (?? instead of ||)
- Re-run calibration if needed

### Issue 4: Missing Identities
**Cause:** Identity bank not loaded or corrupted
**Fix:** Verify `lib/oracle/identities/kcet_math.json` exists and is valid JSON

---

## 📊 SUMMARY

**Flow Status:** ✅ VERIFIED AND CORRECT

**Key Parameters:**
- Difficulty: 37% Easy, 48% Moderate, 15% Hard
- IDS: 89.4% (high cognitive demand)
- Synthesis: 29.4% (property-based fusion)
- Identities: 15 high-confidence (≥75%)
- Board: SYNTHESIZER (multi-property integration)

**Data Sources:**
- Database: rei_evolution_configs, exam_historical_patterns
- JSON: lib/oracle/identities/kcet_math.json
- All sources updated and calibrated

**Output:**
- flagship_final.json (SET A - CORE_LOGIC)
- flagship_final_b.json (SET B - PERIPHERAL_LOGIC)
- Each with 60 questions

**Status:** 🚀 READY FOR GENERATION

---

**Document Version:** 1.0
**Verified By:** REI System Verification
**Last Updated:** 2026-04-15
