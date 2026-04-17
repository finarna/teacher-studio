# Calibration Scripts

**Purpose:** Core TypeScript scripts that implement the KCET Math calibration system

**Location:** `docs/oracle/calibration/scripts/`

---

## Files in This Directory

### 1. questionComparator.ts
**Purpose:** Multi-dimensional comparison engine for generated vs actual papers

**What it does:**
- Compares papers using identity vectors (whole-paper analysis)
- Calculates Identity Hit Rate (Jaccard similarity)
- Computes topic and difficulty distribution similarity
- Performs best-match pairing for detailed analysis

**Key Functions:**
- `comparePapersUsingIdentityVectors()` - Main comparison function
- `extractIdentityVector()` - Extract identity distribution
- `computeIdentityHitRate()` - Calculate IHR metric
- `computeDistributionSimilarity()` - Calculate distribution similarity

**When to use:** Import this when you need to compare generated papers with actual papers

**Dependencies:** None (standalone)

---

### 2. parameterAdjuster.ts
**Purpose:** Adaptive RWC (Recursive Weight Correction) algorithm for parameter calibration

**What it does:**
- Adjusts identity confidences based on match results
- Calibrates rigor drift, synthesis weight, trap weight
- Implements learning rates (+0.08, +0.12, -0.05, -0.02)
- Enforces parameter constraints
- Detects convergence

**Key Functions:**
- `adjustParameters()` - Main calibration loop
- `adjustIdentityConfidences()` - Per-identity feedback
- `adjustRigorDrift()` - Difficulty calibration
- `shouldStopCalibration()` - Convergence detection

**When to use:** Import this to implement iterative parameter adjustment

**Dependencies:** `questionComparator.ts` (for ComparisonSummary type)

---

### 3. calibrationReporter.ts
**Purpose:** Generate comprehensive markdown reports from calibration results

**What it does:**
- Creates main calibration summary report
- Generates per-year iteration logs
- Formats tables, charts, metrics
- Exports calibrated parameters

**Key Functions:**
- `generateCalibrationReport()` - Main summary report
- `generateYearIterationLog()` - Per-year details
- `generateExecutiveSummary()` - High-level metrics
- `formatIdentityConfidences()` - Identity evolution tables

**When to use:** Call this at the end of calibration to generate reports

**Dependencies:** Node.js `fs`, `path`

---

### 4. kcet_math_iterative_calibration_2021_2025.ts
**Purpose:** Main orchestrator script - runs the complete calibration pipeline

**What it does:**
- Extracts 2021 baseline from database
- Calibrates years 2022-2025 iteratively
- Generates predicted papers (60 questions each)
- Assigns identity IDs to generated questions (CRITICAL FIX)
- Compares with actual papers
- Adjusts parameters using RWC algorithm
- Generates all reports

**Execution:**
```bash
npx tsx docs/oracle/calibration/scripts/kcet_math_iterative_calibration_2021_2025.ts
```

**Runtime:** ~20-30 minutes
**Output:** 6 report files + updated identity bank + calibrated engine config

**When to use:** Run this to perform full calibration after new KCET exams

**Dependencies:**
- All other scripts in this directory
- Supabase (database)
- Gemini API (question generation)

---

## Usage Instructions

### Option 1: Run Full Calibration (Recommended)

```bash
# Navigate to project root
cd /Users/apple/FinArna/edujourney---universal-teacher-studio

# Run the main orchestrator
npx tsx docs/oracle/calibration/scripts/kcet_math_iterative_calibration_2021_2025.ts
```

### Option 2: Use Individual Components

```typescript
// Import comparison engine
import { comparePapersUsingIdentityVectors } from './questionComparator';

// Import parameter adjuster
import { adjustParameters } from './parameterAdjuster';

// Import reporter
import { generateCalibrationReport } from './calibrationReporter';

// Use in your own scripts
const comparison = comparePapersUsingIdentityVectors(generated, actual);
const newState = adjustParameters(currentState, comparison);
await generateCalibrationReport(results, outputPath);
```

---

## Development Notes

### Modifying Comparison Logic

Edit `questionComparator.ts`:
- Adjust scoring weights (currently: IHR 50%, Topic 30%, Difficulty 20%)
- Change similarity calculation methods
- Add new comparison dimensions

### Adjusting Learning Rates

Edit `parameterAdjuster.ts`:
- Modify learning rates (currently: +0.08, +0.12, -0.05, -0.02)
- Change parameter constraints (identity [0.35, 0.99], rigor [1.0, 2.5])
- Update convergence criteria (currently: 80% match rate OR <2% change)

### Customizing Reports

Edit `calibrationReporter.ts`:
- Change report format/structure
- Add new sections or metrics
- Customize table layouts

---

## Reference

**Original Locations:**
- `questionComparator.ts` → `lib/oracle/questionComparator.ts`
- `parameterAdjuster.ts` → `lib/oracle/parameterAdjuster.ts`
- `calibrationReporter.ts` → `lib/oracle/calibrationReporter.ts`
- `kcet_math_iterative_calibration_2021_2025.ts` → `scripts/oracle/kcet_math_iterative_calibration_2021_2025.ts`

**Note:** These are COPIES for reference and reuse. The original files in `lib/oracle/` and `scripts/oracle/` are still the active versions used by the main application.

---

**Category:** Scripts
**Total Files:** 4
**Total Size:** ~76 KB
**Status:** ✅ Production Ready
