# Parameter Storage & Usage Guide

**Purpose:** Explains where calibrated REI parameters are stored and how flagship generation uses them

**Last Updated:** 2026-04-14

---

## 🎯 Quick Answer

**Q: Where are the calibrated parameters stored?**
**A: In JSON files (NOT the database)**

**Flagship generation reads from:**
1. ✅ `lib/oracle/engine_config.json` (engine parameters)
2. ✅ `lib/oracle/identities/kcet_math.json` (identity confidences)

**Both files are CALIBRATED and ACTIVE as of 2026-04-14**

---

## 📊 Parameter Storage Architecture

### File-Based Storage (PRIMARY)

Flagship paper generation reads parameters from these JSON files:

#### 1. Engine Configuration
**File:** `lib/oracle/engine_config.json` ⭐ **ACTIVE**

```json
{
  "engine_version": "4.0",
  "rigor_drift_multiplier": 1.6816666666666666,  // ✅ CALIBRATED
  "ids_baseline": 0.8941666666666667,             // ✅ CALIBRATED
  "synthesis_weight": 0.294,                      // ✅ CALIBRATED
  "trap_weight": 0.3,
  "intent_learning_rate": 0.25,
  "volatility_factor": 1.15,
  "solve_tension_multiplier": 1.12,
  "projection_buffer": 1.05,
  "last_updated": "2026-04-14T14:41:59.922Z",
  "calibration_note": "Calibrated using iterative RWC (2021-2025)"
}
```

**Used by:**
- `scripts/oracle/rei_master_orchestrator.ts` (line 15: `CONFIG = JSON.parse(...)`)
- `lib/aiQuestionGenerator.ts` (reads engine config for paper generation)
- All flagship generation scripts

---

#### 2. Identity Bank
**File:** `lib/oracle/identities/kcet_math.json` ⭐ **ACTIVE**

```json
{
  "version": "REI v16.17",
  "subject": "Math",
  "exam": "KCET",
  "identities": [
    {
      "id": "MAT-001",
      "name": "Set Theory De-Morgan",
      "topic": "Sets",
      "confidence": 0.99,  // ✅ CALIBRATED
      "high_yield": false
    },
    // ... 29 more identities, all calibrated
  ]
}
```

**Contains:**
- 30 math identities (MAT-001 through MAT-030)
- Calibrated confidence scores (15 at ≥75%)
- High-yield flags
- Topic mappings

**Used by:**
- Identity-based question allocation
- Topic prediction
- Difficulty distribution
- Flagship paper generation

---

### Database Storage (REFERENCE ONLY)

The database has a table `exam_historical_patterns` that stores historical audit data.

#### Table: exam_historical_patterns

**Purpose:** Historical reference for pattern analysis (NOT used by flagship generation)

**Columns:**
- `exam_context` (e.g., "KCET")
- `subject` (e.g., "Math")
- `year` (e.g., 2022)
- `intent_signature` (JSON with identityVector)
- `ids_actual` (historical IDS value)
- `board_signature` (exam style)
- `evolution_note` (year-over-year changes)

**Current State (Verified 2026-04-14):**
```
Year 2021: IDS 0.855, 3 identities
Year 2022: IDS 0.793, 1 identity
Year 2023: IDS 0.855, 5 identities
Year 2024: IDS 0.788, 1 identity
Year 2025: IDS 0.812, 1 identity
```

**Note:** These database records are sparse (old audits) and NOT used by flagship generation.

**Used by:**
- `rei_master_orchestrator.ts` for historical pattern analysis
- `aiPaperAuditor.ts` for storing new audit results
- Research and analysis (NOT production generation)

---

## 🚀 How Flagship Generation Works

### Step 1: Load Configuration

```typescript
// From rei_master_orchestrator.ts (line 15)
const CONFIG = JSON.parse(
  fs.readFileSync('lib/oracle/engine_config.json', 'utf8')
);

// From rei_master_orchestrator.ts (line 27)
const bank = JSON.parse(
  fs.readFileSync('lib/oracle/identities/kcet_math.json', 'utf8')
);
```

### Step 2: Use Calibrated Parameters

```typescript
// Engine parameters used
rigor_drift_multiplier: 1.68  // ✅ Calibrated
ids_baseline: 0.89            // ✅ Calibrated
synthesis_weight: 0.294       // ✅ Calibrated

// Identity confidences used
MAT-001: 0.99  // ✅ Calibrated
MAT-003: 0.99  // ✅ Calibrated
// ... all 30 calibrated
```

### Step 3: Generate Paper

1. Allocate questions based on identity confidences
2. Apply rigor drift to set difficulty distribution
3. Use IDS baseline for target difficulty
4. Apply synthesis weight for question types
5. Generate 60 questions

---

## ✅ Verification

### Verify Calibrated Parameters Are Active

```bash
# Check engine config
cat lib/oracle/engine_config.json | jq .

# Expected output should show:
# - rigor_drift_multiplier: 1.6816666666666666
# - ids_baseline: 0.8941666666666667
# - synthesis_weight: 0.294
# - calibration_note: "Calibrated using iterative RWC (2021-2025)"
```

```bash
# Check identity confidences
cat lib/oracle/identities/kcet_math.json | jq -r '.identities[] | "\(.id): \(.confidence)"'

# Expected: 30 identities with calibrated scores
# 15 should be ≥0.75 (high-confidence)
```

```bash
# Run verification script
npx tsx docs/oracle/calibration/scripts/verify_and_update_db_calibration.ts

# Expected: "✅ VERIFICATION COMPLETE - System Ready for Production!"
```

---

## 🔄 Update Workflow

### When Calibration Parameters Change

**Files to Update:**
1. ✅ `lib/oracle/engine_config.json` (already updated)
2. ✅ `lib/oracle/identities/kcet_math.json` (already updated)

**Files NOT to Update:**
- ❌ Database `exam_historical_patterns` (reference only, not used)

**Backup Files:**
- `docs/oracle/calibration/configs/engine_config_pre_calibration_backup.json`
- `lib/oracle/engine_config.json.backup`

---

## 📊 Parameter Flow Diagram

```
┌─────────────────────────────────────────┐
│  CALIBRATION SYSTEM                     │
│  (kcet_math_iterative_calibration...)   │
└────────────┬────────────────────────────┘
             │
             │ Outputs calibrated parameters
             ▼
    ┌────────────────────────────────┐
    │  JSON FILES (PRIMARY STORAGE)  │
    │  ─────────────────────────     │
    │  1. engine_config.json ✅      │
    │  2. kcet_math.json ✅          │
    └────────┬───────────────────────┘
             │
             │ Read by flagship generation
             ▼
    ┌────────────────────────────────┐
    │  FLAGSHIP GENERATION           │
    │  (rei_master_orchestrator.ts)  │
    └────────────────────────────────┘
             │
             │ Generates papers using calibrated params
             ▼
    ┌────────────────────────────────┐
    │  2026 PRACTICE PAPERS          │
    │  - 79.2% identity accuracy     │
    │  - Optimized difficulty        │
    └────────────────────────────────┘


┌─────────────────────────────────────────┐
│  DATABASE (REFERENCE ONLY)              │
│  ─────────────────────────────          │
│  exam_historical_patterns               │
│  - Historical audits                    │
│  - NOT used by flagship generation      │
│  - Used for research/analysis only      │
└─────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways

### ✅ What's ACTIVE and Used

1. **`lib/oracle/engine_config.json`**
   - Calibrated: 2026-04-14
   - Contains: Rigor drift, IDS baseline, synthesis weight
   - Used by: ALL flagship generation

2. **`lib/oracle/identities/kcet_math.json`**
   - Calibrated: 2026-04-14
   - Contains: 30 identities with confidence scores
   - Used by: ALL flagship generation

### ❌ What's NOT Used for Flagship Generation

1. **Database `exam_historical_patterns`**
   - Contains: Historical audit data
   - Used for: Research and pattern analysis
   - NOT used for: Flagship paper generation

### 🔑 Bottom Line

**Flagship generation reads ONLY from JSON files.**

Your calibrated parameters are:
- ✅ Saved in JSON files
- ✅ Deployed to production
- ✅ Active and ready to use
- ✅ Will be used for all 2026 flagship papers

**Database is optional - it's just historical reference!**

---

## 📚 Related Documentation

- **Deployment Guide:** `documentation/DEPLOYMENT_VERIFICATION.md`
- **System Architecture:** `documentation/SYSTEM_DOCUMENTATION.md`
- **Calibration Results:** `reports/KCET_MATH_CALIBRATION_REPORT_2021_2025.md`
- **Verification Script:** `scripts/verify_and_update_db_calibration.ts`

---

**Document Version:** 1.0
**Last Updated:** 2026-04-14
**Status:** ✅ Verified - Parameters Active in Production
