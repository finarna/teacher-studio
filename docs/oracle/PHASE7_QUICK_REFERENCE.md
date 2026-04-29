# Phase 7: Quality Verification - Quick Reference

**Generic Script for All NEET Subjects**

---

## One-Command Verification

```bash
npx tsx scripts/oracle/phase7_quality_verification_neet.ts <Subject> <ScanID>
```

---

## Usage Examples

### NEET Physics ✅ COMPLETE
```bash
npx tsx scripts/oracle/phase7_quality_verification_neet.ts Physics 2adcb415-9410-4468-b8f3-32206e5ae7cb
```

### NEET Chemistry ⏳ PENDING
```bash
# After completing Phase 6 for Chemistry:
npx tsx scripts/oracle/phase7_quality_verification_neet.ts Chemistry <chemistry-scan-id>
```

### NEET Botany ⏳ PENDING
```bash
# After completing Phase 6 for Botany:
npx tsx scripts/oracle/phase7_quality_verification_neet.ts Botany <botany-scan-id>
```

### NEET Zoology ⏳ PENDING
```bash
# After completing Phase 6 for Zoology:
npx tsx scripts/oracle/phase7_quality_verification_neet.ts Zoology <zoology-scan-id>
```

---

## Where to Find Scan IDs

Check the subject-specific scan ID registry:

- **Physics:** `docs/oracle/calibration/NEET_PHYSICS_SCAN_ID_REGISTRY.md`
- **Chemistry:** `docs/oracle/calibration/NEET_CHEMISTRY_SCAN_ID_REGISTRY.md`
- **Botany:** `docs/oracle/calibration/NEET_BOTANY_SCAN_ID_REGISTRY.md`
- **Zoology:** `docs/oracle/calibration/NEET_ZOOLOGY_SCAN_ID_REGISTRY.md`

---

## What the Script Checks

### Step 7.1 & 7.2: Comprehensive Verification
- Calibration parameters (IDS, Rigor, Board Signature, Difficulty)
- Total question count (90 expected)

### Step 7.3: Database Quality Checks
1. ✅ Null/Empty metadata detection
2. ✅ Content completeness (7 fields: text, options, answer, solution, tip, difficulty, topic)
3. ✅ Difficulty distribution vs calibration target
4. ✅ SET A/B distribution (45+45 split)

### Step 7.4: Question Type Distribution
- Loads historical analysis (2021-2025)
- Compares generated vs expected question types
- Validates board signature accuracy

### Strategic Differentiation Analysis
- SET A: Formula for CALCULATION analysis
- SET B: Formula for UNDERSTANDING analysis
- Formula vs Conceptual bias scoring

---

## Expected Output

```
╔═══════════════════════════════════════════════════════════════════╗
║        PHASE 7: QUALITY VERIFICATION - NEET <Subject>         ║
╚═══════════════════════════════════════════════════════════════════╝

📊 STEP 7.1 & 7.2: Comprehensive Quality Verification
   ✅ Calibration Parameters: ...
   ✅ Total Questions: 90/90

🔍 STEP 7.3: Database Quality Checks
   ✅ CHECK 1: Null/Empty Metadata
   ✅ CHECK 2: Content Completeness
   ✅ CHECK 3: Difficulty Distribution
   ✅ CHECK 4: SET A/B Distribution

📋 STEP 7.4: Question Type Distribution Verification (CRITICAL)
   Question Type Distribution:
   Board Signature: DIAGRAM_FORMULA_MCQ
   ...

🎯 STRATEGIC DIFFERENTIATION: SET A vs SET B Analysis
   SET A (Formula for CALCULATION): ...
   SET B (Formula for UNDERSTANDING): ...

╔═══════════════════════════════════════════════════════════════════╗
║                  PHASE 7 VERIFICATION SUMMARY                     ║
╚═══════════════════════════════════════════════════════════════════╝

   Overall Status: ✅ PASS
   Phase 7 Quality Verification COMPLETE
   📄 Report saved: docs/oracle/verification/NEET_<SUBJECT>_PHASE7_VERIFICATION.txt
```

---

## Success Criteria

| Check | Threshold | Status |
|-------|-----------|--------|
| Question Count | 90/90 | Must be exact |
| Content Completeness | ≥95% | EXCELLENT if ≥95% |
| Difficulty Variance | ≤10% | PASS if ≤10% |
| SET A/B Split | 45+45 | Must be exact |
| Question Type Accuracy | ≥70% | GOOD if ≥70% |

---

## Output Files

### Automatic Report Generation

The script automatically saves a verification report:

```
docs/oracle/verification/NEET_<SUBJECT>_PHASE7_VERIFICATION.txt
```

Example for Physics:
```
docs/oracle/verification/NEET_PHYSICS_PHASE7_VERIFICATION.txt
```

---

## Troubleshooting

### Error: "Invalid subject"
**Solution:** Use exact capitalization: Physics, Chemistry, Botany, Zoology

### Error: "Scan ID required"
**Solution:** Check the scan ID registry file for your subject

### Error: "Question type analysis not found"
**Solution:** Ensure Phase 3 completed for the subject (creates `QUESTION_TYPE_ANALYSIS_2021_2025_<SUBJECT>.json`)

### Warning: "Low type accuracy"
**Acceptable if:** ≥50% and calibration parameters are correct
**Action needed if:** <50%, consider regenerating with stricter directives

### Warning: "Weak strategic differentiation"
**Acceptable for:** Physics/Chemistry (naturally formula-heavy)
**Action needed for:** Biology subjects if both sets identical

---

## Next Steps After Phase 7

### Option A: Phase 7.5 - Independent Forensic Verification
- Agent-based verification
- Borderline case review
- Time: 30-45 minutes

### Option B: Phase 8 - UI Deployment
- Deploy to production
- Export for student use
- Time: 20-30 minutes

### Option C: Complete Remaining Subjects
- Run Phase 1-7 for other NEET subjects
- Use same generic script for verification

---

## Quick Command Reference

```bash
# STEP 1: Find your scan ID
cat docs/oracle/calibration/NEET_<SUBJECT>_SCAN_ID_REGISTRY.md

# STEP 2: Run Phase 7 verification
npx tsx scripts/oracle/phase7_quality_verification_neet.ts <Subject> <ScanID>

# STEP 3: Review the report
cat docs/oracle/verification/NEET_<SUBJECT>_PHASE7_VERIFICATION.txt

# STEP 4: If all checks pass, proceed to Phase 8
# If issues found, review and potentially regenerate
```

---

## Script Location

**Full Path:**
```
scripts/oracle/phase7_quality_verification_neet.ts
```

**Valid Subjects:**
- Physics
- Chemistry
- Botany
- Zoology

**Time to Execute:** 30-60 seconds per subject

---

**Last Updated:** April 29, 2026
**Status:** Production Ready
**Tested With:** NEET Physics 2026
