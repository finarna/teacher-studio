# Calibration Script - Automatic Database Update

**Version:** 2.0
**Updated:** 2026-04-15
**Status:** ✅ Enhanced - Auto-updates all required database tables

---

## 🎯 What Changed

The KCET Math calibration script has been enhanced to **automatically update all database tables** required for flagship generation.

Previously, you needed to manually run separate scripts to update database tables. Now, **everything happens in one run!**

---

## ⚡ Quick Summary

### Before (Manual Process):
```bash
# 1. Run calibration
npx tsx docs/oracle/calibration/scripts/kcet_math_iterative_calibration_2021_2025.ts

# 2. Manually update rei_evolution_configs
npx tsx scripts/oracle/update_rei_configs.ts

# 3. Manually update exam_historical_patterns
npx tsx scripts/oracle/update_db_with_calibration_results.ts
```

### After (Automated Process):
```bash
# One command does everything!
npx tsx docs/oracle/calibration/scripts/kcet_math_iterative_calibration_2021_2025.ts
```

---

## 📊 What Gets Updated Automatically

### Phase 1-5: Calibration (Existing)
- ✅ Calibrates identity confidences (2021-2025)
- ✅ Calibrates engine parameters (rigor, IDS, synthesis)
- ✅ Iterative parameter adjustment (RWC algorithm)

### Phase 6: Reports & Files (Existing)
- ✅ Generates comprehensive calibration report
- ✅ Generates per-year iteration logs (2022-2025)
- ✅ Updates `lib/oracle/identities/kcet_math.json`
- ✅ Saves `docs/oracle/calibration/engine_config_calibrated.json`

### Phase 7: Database Update (NEW! ⭐)
- ✅ **Updates `rei_evolution_configs` table**
  - Calibrated rigor_drift_multiplier
  - Calibrated ids_baseline
  - Calibrated synthesis_weight
  - Calibrated trap_density_weight
  - Calibrated linguistic_load_weight
  - Calibrated speed_requirement_weight

- ✅ **Updates `exam_historical_patterns` table**
  - Identity vectors for 2021-2025 (12-16 identities per year)
  - IDS actual values (0.68-0.79)
  - Board signatures (ANCHOR, SYNTHESIZER, LOGICIAN)
  - Evolution notes (year-over-year trends)
  - Intent signatures (synthesis, trap density, speed requirement)

---

## 🚀 Usage

### Run Full Calibration

```bash
npx tsx docs/oracle/calibration/scripts/kcet_math_iterative_calibration_2021_2025.ts
```

**Expected Duration:** 2-3 hours (depends on API latency and convergence)

**Console Output:**
```
🔄 KCET MATH ITERATIVE CALIBRATION (2021-2025)
═══════════════════════════════════════════════

📊 Phase 1: Extracting 2021 Baseline
   ✓ 2021 IDS Actual: 0.740
   ✓ Identity Vector: 12 unique identities
   ✓ Total Questions: 60

============================================================
🔄 Phase 2: Calibrating Year 2022
============================================================
   ...

============================================================
📝 Phase 6: Generating Comprehensive Reports
============================================================
   ✓ Main report generated
   ✓ Iteration logs generated

============================================================
📊 Phase 7: Updating Database for Flagship Generation
============================================================

📊 Updating rei_evolution_configs table...
   ✅ rei_evolution_configs updated successfully
      - rigor_drift_multiplier: 1.6817
      - ids_baseline: 0.8942
      - synthesis_weight: 0.2940

📊 Updating exam_historical_patterns table...
   ✅ Year 2021: Updated (12 identities, IDS 0.740)
   ✅ Year 2022: Updated (12 identities, IDS 0.740)
   ✅ Year 2023: Updated (12 identities, IDS 0.760)
   ✅ Year 2024: Updated (15 identities, IDS 0.680)
   ✅ Year 2025: Updated (16 identities, IDS 0.790)

✅ Database tables updated successfully!
   Flagship generation will now use calibrated parameters.

✅ CALIBRATION COMPLETE
═══════════════════════════════════════════════

📊 Final Metrics:
   - Average Match Rate: 62.7%
   - Total Iterations: 7
   - System Confidence: 66.4%

📁 Output Files:
   - Main Report: docs/oracle/calibration/KCET_MATH_CALIBRATION_REPORT_2021_2025.md
   - Identity Bank: lib/oracle/identities/kcet_math.json
   - Engine Config: docs/oracle/calibration/engine_config_calibrated.json
   - Iteration Logs: docs/oracle/calibration/KCET_MATH_*_ITERATION_LOG.md

📊 Database Tables Updated:
   ✅ rei_evolution_configs (engine parameters)
   ✅ exam_historical_patterns (2021-2025 identity vectors)

🚀 System Ready for Flagship Generation!
   Run: npx tsx scripts/oracle/generate_flagship_oracle.ts Math
```

---

## 🔍 Verification

After calibration completes, verify database tables were updated:

```bash
# Check rei_evolution_configs
npx tsx scripts/oracle/check_rei_configs.ts

# Check exam_historical_patterns
npx tsx docs/oracle/calibration/scripts/verify_and_update_db_calibration.ts
```

Expected output:
```
✅ rei_evolution_configs updated with calibrated parameters
✅ exam_historical_patterns has 5 records (2021-2025)
✅ All tables ready for flagship generation
```

---

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  CALIBRATION SCRIPT                                     │
│  kcet_math_iterative_calibration_2021_2025.ts           │
└────────────┬────────────────────────────────────────────┘
             │
             ├─► Phase 1-5: Calibrate Parameters
             │   (2021 baseline + 2022-2025 iterations)
             │
             ├─► Phase 6: Update JSON Files
             │   ├─ lib/oracle/identities/kcet_math.json
             │   └─ engine_config_calibrated.json
             │
             └─► Phase 7: Update Database Tables ⭐ NEW
                 ├─ rei_evolution_configs
                 │  (engine parameters)
                 │
                 └─ exam_historical_patterns
                    (identity vectors 2021-2025)

                    ↓

┌─────────────────────────────────────────────────────────┐
│  FLAGSHIP GENERATION SCRIPT                             │
│  generate_flagship_oracle.ts                            │
└────────────┬────────────────────────────────────────────┘
             │
             │ Reads from:
             ├─► rei_evolution_configs (DB)
             ├─► exam_historical_patterns (DB)
             └─► lib/oracle/identities/kcet_math.json (File)

             ↓

      Generates SET A and SET B
      (flagship_final.json, flagship_final_b.json)
```

---

## 🔧 Technical Details

### New Function: `updateDatabaseTablesForFlagship()`

Located in: `docs/oracle/calibration/scripts/kcet_math_iterative_calibration_2021_2025.ts` (lines 262-368)

**Purpose:** Automatically update database tables with calibration results

**Parameters:**
- `yearResults: YearCalibrationResult[]` - Calibration results for 2022-2025
- `finalState: CalibrationState` - Final calibrated parameters
- `baseline2021: any` - 2021 baseline data
- `identities: any[]` - Identity bank

**Updates:**
1. `rei_evolution_configs` table:
   - `rigor_drift_multiplier`
   - `ids_baseline`
   - `synthesis_weight`
   - `trap_density_weight`
   - `linguistic_load_weight`
   - `speed_requirement_weight`

2. `exam_historical_patterns` table (5 records):
   - Year 2021-2025
   - Identity vectors (identityVector within intent_signature)
   - IDS actual values
   - Board signatures
   - Evolution notes
   - Intent signatures

### Updated Type: `YearCalibrationResult`

Located in: `lib/oracle/calibrationReporter.ts` (lines 18-32)

**New Fields:**
```typescript
export interface YearCalibrationResult {
  // ... existing fields
  identityVector?: Record<string, number>;  // NEW
  boardSignature?: string;                  // NEW
}
```

These fields are populated during calibration and used to update the database.

---

## 💡 Benefits

### 1. **One-Step Calibration**
No need to run separate scripts - everything happens automatically

### 2. **Consistency**
Database always matches JSON files after calibration

### 3. **Ready for Production**
Flagship generation can run immediately after calibration completes

### 4. **Complete Audit Trail**
All calibration results (files + database) are updated together

### 5. **No Manual Errors**
Eliminates risk of forgetting to update database tables

---

## 🎯 Next Steps After Calibration

Once calibration completes, you can immediately generate flagship papers:

```bash
# Generate KCET Math SET A and SET B
npx tsx scripts/oracle/generate_flagship_oracle.ts Math
```

This will use:
- ✅ Calibrated parameters from `rei_evolution_configs`
- ✅ Historical patterns from `exam_historical_patterns`
- ✅ Identity confidences from `lib/oracle/identities/kcet_math.json`

---

## 📚 Related Documentation

- **Main Calibration Guide:** `docs/oracle/calibration/README.md`
- **System Documentation:** `docs/oracle/calibration/documentation/SYSTEM_DOCUMENTATION.md`
- **Parameter Storage Guide:** `docs/oracle/calibration/configs/PARAMETER_STORAGE_GUIDE.md`
- **Flagship Generation Script:** `scripts/oracle/generate_flagship_oracle.ts`

---

## ✅ Summary

**Before:** Manual 3-step process (calibration + 2 separate DB updates)

**After:** Automatic 1-step process (calibration auto-updates everything)

**Result:** Faster, more reliable, production-ready system!

---

**Version:** 2.0
**Author:** REI Calibration Team
**Last Updated:** 2026-04-15
