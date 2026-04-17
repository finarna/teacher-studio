# KCET Math Calibration System - Complete Files Index

**Last Updated:** 2026-04-14
**Version:** 1.0

This document provides a complete index of all files related to the KCET Math Iterative Calibration System, organized by category with descriptions and locations.

---

## 📂 Directory Structure

```
edujourney---universal-teacher-studio/
│
├── lib/oracle/
│   ├── questionComparator.ts        [CORE] Multi-dimensional comparison engine
│   ├── parameterAdjuster.ts          [CORE] Adaptive RWC calibration algorithm
│   ├── calibrationReporter.ts        [CORE] Report generation utilities
│   ├── identities/
│   │   └── kcet_math.json            [DATA] Identity bank (30 identities, updated)
│   └── engine_config.json            [CONFIG] REI engine parameters
│
├── scripts/oracle/
│   └── kcet_math_iterative_calibration_2021_2025.ts  [MAIN] Orchestrator script
│
└── docs/oracle/calibration/
    ├── README.md                              [DOC] Quick start guide
    ├── SYSTEM_DOCUMENTATION.md                [DOC] Complete technical documentation
    ├── EXECUTION_SUMMARY_2026-04-14.md        [DOC] Detailed execution log
    ├── FILES_INDEX.md                         [DOC] This file
    │
    ├── KCET_MATH_CALIBRATION_REPORT_2021_2025.md  [REPORT] Main summary report
    ├── KCET_MATH_2022_ITERATION_LOG.md            [REPORT] Year 2022 iteration details
    ├── KCET_MATH_2023_ITERATION_LOG.md            [REPORT] Year 2023 iteration details
    ├── KCET_MATH_2024_ITERATION_LOG.md            [REPORT] Year 2024 iteration details
    ├── KCET_MATH_2025_ITERATION_LOG.md            [REPORT] Year 2025 iteration details
    │
    └── engine_config_calibrated.json              [OUTPUT] Calibrated parameters (ready for deployment)
```

---

## 🔧 Core Components

### 1. Question Comparator
**File:** `lib/oracle/questionComparator.ts`
**Size:** ~20 KB
**Lines:** ~600
**Purpose:** Multi-dimensional comparison engine for generated vs actual papers

**Key Functions:**
- `comparePapersUsingIdentityVectors()` - Whole-paper comparison using distributions
- `compareQuestions()` - 5-dimensional question-level scoring
- `extractIdentityVector()` - Extract identity distribution from paper
- `computeIdentityHitRate()` - Calculate Jaccard similarity
- `computeDistributionSimilarity()` - Calculate normalized L1 distance
- `performBestMatchComparison()` - Greedy bipartite matching for detailed analysis

**Dependencies:**
- None (standalone utility)

**Last Modified:** 2026-04-14 (fixed for whole-paper comparison)

---

### 2. Parameter Adjuster
**File:** `lib/oracle/parameterAdjuster.ts`
**Size:** ~15 KB
**Lines:** ~450
**Purpose:** Adaptive RWC algorithm for parameter calibration

**Key Functions:**
- `adjustParameters()` - Main calibration loop
- `adjustIdentityConfidences()` - Per-identity feedback with learning rates
- `adjustRigorDrift()` - Difficulty distribution calibration
- `adjustIntentSignature()` - Synthesis/trap weight adjustment
- `shouldStopCalibration()` - Convergence detection

**Algorithm:**
- Learning rates: +0.08 (correct), +0.12 (missed), -0.05 (false positive), -0.02 (correct negative)
- Constraints: Identity [0.35, 0.99], Rigor [1.0, 2.5], Weights [0.10, 0.50]
- Convergence: ≥80% match rate OR change <2% OR max 10 iterations

**Dependencies:**
- `questionComparator.ts` (for ComparisonSummary type)

**Last Modified:** 2026-04-14

---

### 3. Calibration Reporter
**File:** `lib/oracle/calibrationReporter.ts`
**Size:** ~19 KB
**Lines:** ~550
**Purpose:** Generate comprehensive markdown reports

**Key Functions:**
- `generateCalibrationReport()` - Main summary report
- `generateYearIterationLog()` - Per-year detailed logs
- `generateExecutiveSummary()` - Overall metrics
- `formatIdentityConfidences()` - Identity evolution tables
- `calculateSystemConfidence()` - Validation metrics

**Output Files:**
- `KCET_MATH_CALIBRATION_REPORT_2021_2025.md` (7.8 KB)
- `KCET_MATH_{year}_ITERATION_LOG.md` (11-14 KB each)
- `engine_config_calibrated.json` (406 bytes)

**Dependencies:**
- `fs` (Node.js file system)
- `path` (Node.js path utilities)

**Last Modified:** 2026-04-14

---

### 4. Main Orchestrator
**File:** `scripts/oracle/kcet_math_iterative_calibration_2021_2025.ts`
**Size:** ~22 KB
**Lines:** ~650
**Purpose:** End-to-end calibration orchestration

**Key Functions:**
- `main()` - Entry point and phase coordination
- `extract2021Baseline()` - Initialize from 2021 actual paper
- `calibrateYear()` - Single-year calibration loop
- `generatePredictedPaper()` - Generate 60 questions with identity assignment
- `buildGenerationContext()` - Prepare REI oracle mode parameters

**Execution Flow:**
1. Phase 1: Extract 2021 baseline
2. Phase 2-5: Calibrate years 2022-2025
3. Phase 6: Generate reports

**Critical Fix Applied:**
Identity assignment logic (lines ~250-270) - assigns IDs to generated questions based on topic with confidence-weighted preference.

**Dependencies:**
- `@supabase/supabase-js` (database access)
- `dotenv` (environment variables)
- `questionComparator.ts`
- `parameterAdjuster.ts`
- `calibrationReporter.ts`
- `aiPaperAuditor.ts`
- Various REI utilities

**Last Modified:** 2026-04-14 (identity assignment fix)

---

## 📊 Data Files

### 1. Identity Bank
**File:** `lib/oracle/identities/kcet_math.json`
**Size:** Variable (~15-20 KB)
**Purpose:** Definition of 30 math identities (MAT-001 through MAT-030)

**Structure:**
```json
{
  "version": "16.17",
  "exam": "KCET",
  "subject": "Math",
  "identities": [
    {
      "id": "MAT-001",
      "name": "Sets",
      "topic": "Sets",
      "confidence": 0.99,
      "expectedQuestionCount": 1,
      "flags": ["high_yield"]
    }
  ]
}
```

**Updated By:** Calibration script (final confidences)

**Last Modified:** 2026-04-14 (calibration run)

---

### 2. Engine Config (Original)
**File:** `lib/oracle/engine_config.json`
**Size:** ~1 KB
**Purpose:** REI engine parameters (pre-calibration)

**Parameters:**
- `rigor_drift_multiplier`: 1.72 → 1.68 (calibrated)
- `ids_baseline`: 0.85 → 0.89 (calibrated)
- `synthesis_weight`: 0.35 → 0.294 (calibrated)
- `trap_weight`: 0.3 (unchanged)

**Last Modified:** Pre-calibration

---

### 3. Engine Config (Calibrated)
**File:** `docs/oracle/calibration/engine_config_calibrated.json`
**Size:** 406 bytes
**Purpose:** Calibrated REI parameters (ready for deployment)

**Status:** ✅ Production Ready

**Deployment:**
```bash
cp docs/oracle/calibration/engine_config_calibrated.json lib/oracle/engine_config.json
```

**Last Generated:** 2026-04-14 20:11:59

---

## 📄 Documentation Files

### 1. README
**File:** `docs/oracle/calibration/README.md`
**Size:** ~10 KB
**Purpose:** Quick start guide and overview

**Sections:**
- Latest calibration results
- Quick links
- System architecture
- Comparison methodology
- Usage guide
- Troubleshooting

**Last Updated:** 2026-04-14

---

### 2. System Documentation
**File:** `docs/oracle/calibration/SYSTEM_DOCUMENTATION.md`
**Size:** ~50 KB
**Purpose:** Complete technical documentation

**Sections:**
1. System Overview
2. Architecture
3. Core Components (detailed)
4. Calibration Algorithm (formulas)
5. Data Flow
6. Usage Guide (commands)
7. Output Files (descriptions)
8. Troubleshooting (common issues)
9. Future Enhancements

**Audience:** Developers, technical users

**Last Created:** 2026-04-14

---

### 3. Execution Summary
**File:** `docs/oracle/calibration/EXECUTION_SUMMARY_2026-04-14.md`
**Size:** ~40 KB
**Purpose:** Detailed log of calibration run

**Sections:**
- Executive Summary
- Execution Timeline
- Detailed Results by Year
- Overall Metrics
- Parameter Evolution
- Identity Assignment Fix (before/after)
- Output Files Generated
- Technical Performance
- Analysis & Insights
- Validation & Confidence
- Recommendations
- Lessons Learned

**Audience:** Technical teams, post-execution review

**Last Created:** 2026-04-14

---

### 4. Files Index
**File:** `docs/oracle/calibration/FILES_INDEX.md`
**Size:** This file
**Purpose:** Complete file inventory and reference guide

**Last Updated:** 2026-04-14

---

## 📊 Report Files

### 1. Main Calibration Report
**File:** `docs/oracle/calibration/KCET_MATH_CALIBRATION_REPORT_2021_2025.md`
**Size:** 7.8 KB
**Generated:** 2026-04-14 20:11:59

**Sections:**
- Executive Summary (overall metrics)
- Year-by-Year Results (table)
- Detailed Iteration Logs (summary)
- Final Calibrated Parameters
- Top 10 High-Confidence Identities
- Low-Confidence Identities
- Identity Bank Evolution (gainers/losers)
- Topic Distribution Analysis
- Validation Metrics (system confidence, stability)
- Recommendations & Insights

**Key Metrics:**
- Average Match Rate: 62.7%
- Identity Hit Rate: 79.2% (2025)
- System Confidence: 66.4%
- Total Iterations: 7

---

### 2. Year 2022 Iteration Log
**File:** `docs/oracle/calibration/KCET_MATH_2022_ITERATION_LOG.md`
**Size:** 11 KB
**Generated:** 2026-04-14 20:11:59

**Contents:**
- Final Match Rate: 58.3%
- Total Iterations: 3
- Iteration-by-iteration metrics
- Parameter changes per iteration

**Key Results:**
- Best iteration: #2 (58.8% match rate)
- IHR: 58.3%
- 24 identities adjusted

---

### 3. Year 2023 Iteration Log
**File:** `docs/oracle/calibration/KCET_MATH_2023_ITERATION_LOG.md`
**Size:** 14 KB
**Generated:** 2026-04-14 20:11:59

**Contents:**
- Final Match Rate: 59.6%
- Total Iterations: 2
- Iteration-by-iteration metrics
- Parameter changes per iteration

**Key Results:**
- Best iteration: #1 (60.1% match rate)
- IHR: 62.5% (+4.2% from 2022)
- Fast convergence (2 iterations)

---

### 4. Year 2024 Iteration Log
**File:** `docs/oracle/calibration/KCET_MATH_2024_ITERATION_LOG.md`
**Size:** 13 KB
**Generated:** 2026-04-14 20:11:59

**Contents:**
- Final Match Rate: 66.4%
- Total Iterations: 1
- Single-iteration convergence

**Key Results:**
- IHR: 70.8% (+8.3% from 2023)
- Ultra-fast convergence (1 iteration)
- Major performance jump

---

### 5. Year 2025 Iteration Log
**File:** `docs/oracle/calibration/KCET_MATH_2025_ITERATION_LOG.md`
**Size:** 13 KB
**Generated:** 2026-04-14 20:11:59

**Contents:**
- Final Match Rate: 66.6%
- Total Iterations: 1
- Single-iteration convergence

**Key Results:**
- **IHR: 79.2%** 🎯 (+8.4% from 2024)
- Just 0.8% from 80% target!
- System matured and stable

---

## 🔧 Modified Supporting Files

### 1. AI Paper Auditor
**File:** `lib/aiPaperAuditor.ts`
**Size:** ~5 KB
**Purpose:** Extract intent signatures from scanned papers

**Modification:** Added identity validation layer (lines ~107-137)

**Problem Fixed:** AI was generating invalid identity IDs like "MAT-MATR-NIL"

**Solution:** Validation layer with fuzzy matching to map invalid IDs to valid ones

**Impact:** Enabled identity vector comparison to work correctly

**Last Modified:** 2026-04-14

---

## 📊 Database Schema (Reference)

### Questions Table
**Location:** Supabase database
**Relevant Columns:**
- `text` (question text)
- `topic` (topic category)
- `difficulty` (Easy/Moderate/Hard)
- `options` (JSON array)
- `correct_option_index` (0-3)
- `solution_steps` (text)
- `question_order` (integer)
- `scan_id` (UUID, links to paper)

### Paper IDs (Used in Calibration)
- 2021: `eba5ed94-dde7-4171-80ff-aecbf0c969f7`
- 2022: `0899f3e1-9980-48f4-9caa-91c65de53830`
- 2023: `eeed39eb-6ffe-4aaa-b752-b3139b311e6d`
- 2024: `7019df69-f2e2-4464-afbb-cc56698cb8e9`
- 2025: `c202f81d-cc53-40b1-a473-8f621faac5ba`

---

## 🚀 Usage Commands

### Run Full Calibration
```bash
npx tsx scripts/oracle/kcet_math_iterative_calibration_2021_2025.ts
```

### Deploy Calibrated Parameters
```bash
# Copy calibrated engine config to production
cp docs/oracle/calibration/engine_config_calibrated.json lib/oracle/engine_config.json

# Identity bank is already updated in-place at:
# lib/oracle/identities/kcet_math.json
```

### Generate Reports Only (If Needed)
```typescript
// In TypeScript console or script:
import { generateCalibrationReport } from './lib/oracle/calibrationReporter';

const results = { /* calibration results */ };
await generateCalibrationReport(
  results,
  'docs/oracle/calibration/KCET_MATH_CALIBRATION_REPORT_2021_2025.md'
);
```

---

## 📦 Dependencies

### Runtime Dependencies
- `@supabase/supabase-js` - Database access
- `dotenv` - Environment variables
- `@google/generative-ai` - Gemini API (Vertex AI)

### Development Dependencies
- `tsx` - TypeScript execution
- `typescript` - Type checking

### Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` or `VITE_GEMINI_API_KEY`

---

## 📈 Metrics Summary

### File Statistics

| Category | Files | Total Size | Lines of Code |
|----------|-------|------------|---------------|
| Core Components | 3 | ~54 KB | ~1,600 |
| Main Orchestrator | 1 | ~22 KB | ~650 |
| Data Files | 2 | ~20 KB | N/A |
| Documentation | 4 | ~100 KB | N/A |
| Reports | 6 | ~65 KB | N/A |
| **Total** | **16** | **~261 KB** | **~2,250** |

### Execution Metrics (Latest Run)

| Metric | Value |
|--------|-------|
| Total Runtime | 24 minutes |
| Questions Generated | 420 (60 × 7 iterations) |
| API Calls | ~240 |
| Database Queries | ~20 |
| Memory Peak | ~3 GB |
| Success Rate | 100% |

---

## 🔍 Quick File Finder

### Need to...

**Understand the system?**
→ Read `SYSTEM_DOCUMENTATION.md`

**See latest results?**
→ Read `KCET_MATH_CALIBRATION_REPORT_2021_2025.md`

**Check detailed execution?**
→ Read `EXECUTION_SUMMARY_2026-04-14.md`

**Deploy parameters?**
→ Copy `engine_config_calibrated.json`

**Review year 2025 iterations?**
→ Read `KCET_MATH_2025_ITERATION_LOG.md`

**Modify comparison logic?**
→ Edit `lib/oracle/questionComparator.ts`

**Adjust learning rates?**
→ Edit `lib/oracle/parameterAdjuster.ts`

**Change iteration limits?**
→ Edit `scripts/oracle/kcet_math_iterative_calibration_2021_2025.ts`

**Update identities?**
→ Edit `lib/oracle/identities/kcet_math.json`

---

## 📝 Version History

### v1.0 (2026-04-14)
- ✅ Initial calibration system deployment
- ✅ Identity assignment fix applied
- ✅ Full calibration run completed (2022-2025)
- ✅ IHR achieved 79.2%
- ✅ All documentation generated

### Planned v1.1 (Post-2026 Exam)
- Re-run calibration with 2026 actual data
- Improve topic accuracy algorithm
- Add confidence intervals

---

## 🎯 Next Steps

1. **Deploy Calibrated Parameters** (Immediate)
   - Copy `engine_config_calibrated.json` to production
   - Use updated identity bank for 2026 flagship generation

2. **Monitor Student Performance** (Ongoing)
   - Track accuracy on high-confidence identity questions
   - Validate that 99% confidence identities perform well

3. **Post-2026 Validation** (After KCET 2026)
   - Compare predictions with actual 2026 exam
   - Calculate final prediction accuracy
   - Re-run calibration with 2026 included

4. **Topic Accuracy Improvement** (Next 3 months)
   - Analyze why topic accuracy is 50%
   - Refine allocation algorithm
   - Target 70%+ topic accuracy

---

**Files Index Version:** 1.0
**Last Updated:** 2026-04-14
**Maintained By:** REI Calibration Team
**Status:** ✅ Complete
