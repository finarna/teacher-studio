# Calibration Configurations

**Purpose:** Calibrated parameters and identity banks ready for production deployment

**Location:** `docs/oracle/calibration/configs/`

---

## Files in This Directory

### 1. engine_config_calibrated.json ⭐ PRIMARY CONFIG
**Type:** Calibrated Engine Parameters
**Size:** 406 bytes
**Status:** ✅ **READY FOR DEPLOYMENT**

**What's inside:**
```json
{
  "engine_version": "4.0",
  "rigor_drift_multiplier": 1.6816666666666666,
  "ids_baseline": 0.8941666666666667,
  "synthesis_weight": 0.294,
  "trap_weight": 0.3,
  "intent_learning_rate": 0.25,
  "volatility_factor": 1.15,
  "solve_tension_multiplier": 1.12,
  "projection_buffer": 1.05,
  "last_updated": "2026-04-14T14:41:59.922Z",
  "calibration_note": "Calibrated using iterative RWC (2021-2025)"
}
```

**When to use:**
- ✅ Deploying calibrated parameters to production
- ✅ Generating 2026 KCET Math flagship papers
- ✅ Using optimized REI parameters

**How to deploy:**
```bash
# Deploy to production
cp docs/oracle/calibration/configs/engine_config_calibrated.json lib/oracle/engine_config.json
```

**What changed from pre-calibration:**
- `rigor_drift_multiplier`: 1.72 → 1.68 (-2.3%)
- `ids_baseline`: 0.85 → 0.89 (+4.7%)
- `synthesis_weight`: 0.30 → 0.294 (-2.0%)

---

### 2. engine_config_production_current.json
**Type:** Current Production Config
**Size:** ~1 KB
**Status:** ✅ **CURRENTLY ACTIVE**

**What's inside:**
Same as `engine_config_calibrated.json` (this is a snapshot of what's currently deployed in `lib/oracle/engine_config.json`)

**When to use:**
- ✅ Reference: Check what's currently in production
- ✅ Verification: Confirm deployment succeeded

**Note:** This file is a COPY of the currently active production config for reference purposes.

---

### 3. engine_config_pre_calibration_backup.json
**Type:** Pre-Calibration Backup
**Size:** ~1 KB
**Status:** 📦 **BACKUP ONLY**

**What's inside:**
Original engine config BEFORE calibration:
```json
{
  "rigor_drift_multiplier": 1.72,
  "ids_baseline": 0.85,
  "synthesis_weight": 0.30,
  "trap_weight": 0.30,
  "last_updated": "2026-04-13T11:20:00Z"
}
```

**When to use:**
- ✅ Rollback: If needed to revert to pre-calibration state
- ✅ Comparison: See what changed during calibration
- ✅ Analysis: Understand calibration impact

**How to rollback:**
```bash
# Rollback to pre-calibration
cp docs/oracle/calibration/configs/engine_config_pre_calibration_backup.json lib/oracle/engine_config.json
```

---

### 4. kcet_math_identities_calibrated.json ⭐ PRIMARY IDENTITY BANK
**Type:** Calibrated Identity Bank
**Size:** ~20 KB
**Status:** ✅ **READY FOR USE**

**What's inside:**
All 30 KCET Math identities (MAT-001 through MAT-030) with calibrated confidence scores.

**Structure:**
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
      "logic": "...",
      "confidence": 0.99,
      "high_yield": false
    }
    // ... 29 more identities
  ]
}
```

**Confidence Distribution:**
- **15 High-Confidence (≥75%):** MAT-001, 003, 004, 006, 010, 013, 014, 016, 017, 020, 022, 024, 025, 026, 029
- **9 Medium-Confidence (40-75%):** MAT-005, 008, 009, 012, 019, 027, 028, 030, 007
- **6 Low-Confidence (<40%):** MAT-002, 011, 015, 018, 021, 023

**When to use:**
- ✅ Generating flagship papers (already deployed to `lib/oracle/identities/kcet_math.json`)
- ✅ Reference: Check confidence scores for specific identities
- ✅ Analysis: Understand which concepts are high-yield

**Already deployed to:**
`lib/oracle/identities/kcet_math.json` (ACTIVE)

---

## Configuration Hierarchy

### Production Files (ACTIVE)
These are the files currently being used by the application:

1. **`lib/oracle/engine_config.json`** ← Main engine parameters
2. **`lib/oracle/identities/kcet_math.json`** ← Identity bank

### Calibration Configs (REFERENCE)
These are copies/backups stored here for reference:

1. **`engine_config_calibrated.json`** ← Final calibrated version
2. **`engine_config_production_current.json`** ← Copy of what's in production
3. **`engine_config_pre_calibration_backup.json`** ← Pre-calibration backup
4. **`kcet_math_identities_calibrated.json`** ← Calibrated identity bank

---

## Deployment Status

### ✅ Already Deployed (2026-04-14)

Both calibrated configs are ACTIVE in production:

```bash
# Engine config deployed
lib/oracle/engine_config.json = engine_config_calibrated.json ✅

# Identity bank deployed
lib/oracle/identities/kcet_math.json = kcet_math_identities_calibrated.json ✅
```

**Flagship paper generation is now using calibrated parameters!**

---

## Usage Guide

### Deploy Calibrated Parameters (Already Done!)

```bash
# Engine config (ALREADY DEPLOYED)
cp docs/oracle/calibration/configs/engine_config_calibrated.json lib/oracle/engine_config.json

# Note: Identity bank was updated in-place during calibration
# lib/oracle/identities/kcet_math.json already has calibrated confidences
```

### Verify Deployment

```bash
# Check engine config
cat lib/oracle/engine_config.json | jq .

# Check identity confidences
cat lib/oracle/identities/kcet_math.json | jq -r '.identities[] | "\(.id): \(.confidence)"'
```

### Rollback to Pre-Calibration

```bash
# Only if absolutely necessary!
cp docs/oracle/calibration/configs/engine_config_pre_calibration_backup.json lib/oracle/engine_config.json

# Note: Identity bank rollback would require git revert or manual restoration
```

---

## Quick Reference: Parameter Changes

| Parameter | Pre-Calibration | Calibrated | Change | Impact |
|-----------|-----------------|------------|--------|--------|
| `rigor_drift_multiplier` | 1.72 | 1.68 | -2.3% | Slightly easier papers |
| `ids_baseline` | 0.85 | 0.89 | +4.7% | Higher baseline difficulty |
| `synthesis_weight` | 0.30 | 0.294 | -2.0% | Less synthesis focus |
| `trap_weight` | 0.30 | 0.30 | 0% | Unchanged |

---

## Quick Reference: Top 15 High-Confidence Identities

| Identity | Topic | Confidence |
|----------|-------|------------|
| MAT-001 | Sets | 99% |
| MAT-003 | Trigonometric Functions | 99% |
| MAT-004 | Complex Numbers | 99% |
| MAT-006 | Linear Inequalities | 94% |
| MAT-010 | Straight Lines | 85% |
| MAT-013 | Statistics | 99% |
| MAT-014 | Probability | 99% |
| MAT-016 | Matrices | 99% |
| MAT-017 | Determinants | 99% |
| MAT-020 | Application of Derivatives | 99% |
| MAT-022 | Integrals | 99% |
| MAT-024 | Application of Integrals | 99% |
| MAT-025 | Differential Equations | 99% |
| MAT-026 | Vector Algebra | 99% |
| MAT-029 | Linear Programming | 99% |

**Use these 15 identities as the foundation for 2026 KCET Math preparation!**

---

### 5. PARAMETER_STORAGE_GUIDE.md 📚 REFERENCE GUIDE
**Type:** Documentation
**Size:** ~15 KB
**Purpose:** Explains where parameters are stored and how they're used

**What's inside:**
- Parameter storage architecture (files vs database)
- How flagship generation reads parameters
- Database table explanation (reference only)
- Verification commands
- Parameter flow diagram
- Key takeaways

**When to read:**
- ✅ Understanding where parameters are stored
- ✅ Verifying parameters are active
- ✅ Clarifying file-based vs database storage
- ✅ Troubleshooting parameter loading issues

**Key Points:**
- Flagship generation reads from JSON files (NOT database)
- Database `exam_historical_patterns` is reference only
- All calibrated parameters are in JSON files and ACTIVE

---

**Category:** Configurations
**Total Files:** 5 (4 configs + 1 guide)
**Total Size:** ~37 KB
**Status:** ✅ Deployed to Production (2026-04-14)
