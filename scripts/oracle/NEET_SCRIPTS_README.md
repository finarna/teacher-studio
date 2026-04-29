# NEET Scripts Documentation - Reusable Components

**Version:** 1.0 (REI v17 Calibration System)
**Based On:** NEET Physics 2026 Production Workflow
**Status:** Production-Ready, Reusable for All NEET Subjects
**Last Updated:** April 30, 2026

---

## Overview

This directory contains all scripts for NEET flagship paper generation using the REI v17 calibration system. All scripts are parameterized and reusable across subjects (Physics, Chemistry, Botany, Zoology).

**Total Scripts:** 33
**Production-Ready:** ✅ Yes
**Tested On:** NEET Physics 2026 (Phases 1-8 COMPLETE)

---

## Script Categories

### 1. Historical Data Verification (Shared - All Subjects)

| Script | Purpose | Execution | Output |
|--------|---------|-----------|--------|
| `find_all_neet_scans_2021_2025.ts` | Find all NEET scans from 2021-2025 in database | `npx tsx scripts/oracle/find_all_neet_scans_2021_2025.ts` | Console report with scan counts per year/subject |
| `verify_neet_scans_2021_2025.ts` | Verify data quality and completeness | `npx tsx scripts/oracle/verify_neet_scans_2021_2025.ts` | Validation report with quality metrics |
| `check_neet_data.ts` | Check specific subject data | `npx tsx scripts/oracle/check_neet_data.ts` | Quick validation for one subject |
| `check_all_neet_data.ts` | Check all 4 NEET subjects | `npx tsx scripts/oracle/check_all_neet_data.ts` | Comprehensive multi-subject report |

**When to Use:**
- Before starting Phase 1 calibration
- To verify historical data exists (2021-2025, 5 years)
- To check data quality and completeness

**Expected Output:**
```
NEET Physics: ✅ 450 questions (90 per year × 5 years)
NEET Chemistry: ✅ 450 questions
NEET Botany: ✅ 450 questions
NEET Zoology: ✅ 450 questions
```

---

### 2. Phase 1-4: Calibration (Per Subject)

#### Question Type Analysis

| Script | Purpose | Subject | Output File |
|--------|---------|---------|-------------|
| `analyze_neet_physics_question_types_2021_2025.ts` | Analyze Physics question types | Physics | `QUESTION_TYPE_ANALYSIS_2021_2025_PHYSICS.json` |
| `analyze_neet_chemistry_question_types_2021_2025.ts` | Analyze Chemistry question types | Chemistry | `QUESTION_TYPE_ANALYSIS_2021_2025_CHEMISTRY.json` |
| `analyze_neet_botany_question_types_2021_2025.ts` | Analyze Botany question types | Botany | `QUESTION_TYPE_ANALYSIS_2021_2025_BOTANY.json` |
| `analyze_neet_zoology_question_types_2021_2025.ts` | Analyze Zoology question types | Zoology | `QUESTION_TYPE_ANALYSIS_2021_2025_ZOOLOGY.json` |

**Purpose:** Identify dominant question patterns from 2021-2025 to determine board signature

**Execution Example:**
```bash
npx tsx scripts/oracle/analyze_neet_physics_question_types_2021_2025.ts
```

**Key Outputs:**
- Question type distribution (e.g., simple_recall_mcq: 78%)
- Board signature identification (e.g., "DIAGRAM_FORMULA_MCQ")
- Year-over-year trends

#### Identity Bank Building

| Script | Purpose | Subject | Output File |
|--------|---------|---------|-------------|
| `build_neet_physics_identities_2021_2025.ts` | Build Physics identity bank | Physics | `lib/oracle/identities/neet_physics.json` |
| `build_neet_chemistry_identities_2021_2025.ts` | Build Chemistry identity bank | Chemistry | `lib/oracle/identities/neet_chemistry.json` |
| `build_neet_botany_identities_2021_2025.ts` | Build Botany identity bank | Botany | `lib/oracle/identities/neet_botany.json` |
| `build_neet_zoology_identities_2021_2025.ts` | Build Zoology identity bank | Zoology | `lib/oracle/identities/neet_zoology.json` |

**Purpose:** Create topic-wise representative question identities (180 per subject)

**Execution Example:**
```bash
npx tsx scripts/oracle/build_neet_physics_identities_2021_2025.ts
```

**Expected Output:**
- 180 identities (36 per year × 5 years)
- Organized by NTA topics
- Difficulty distribution preserved

**Validation:**
```bash
jq '.identities | length' lib/oracle/identities/neet_physics.json
# Expected: 180
```

#### Iterative Calibration

| Script | Purpose | Subject | Output Files |
|--------|---------|---------|--------------|
| `neet_physics_iterative_calibration_2021_2025.ts` | Calibrate Physics parameters | Physics | `identity_confidences_neet_physics.json`, `engine_config_calibrated_neet_physics.json` |
| `neet_chemistry_iterative_calibration_2021_2025.ts` | Calibrate Chemistry parameters | Chemistry | `identity_confidences_neet_chemistry.json`, `engine_config_calibrated_neet_chemistry.json` |
| `neet_botany_iterative_calibration_2021_2025.ts` | Calibrate Botany parameters | Botany | `identity_confidences_neet_botany.json`, `engine_config_calibrated_neet_botany.json` |
| `neet_zoology_iterative_calibration_2021_2025.ts` | Calibrate Zoology parameters | Zoology | `identity_confidences_neet_zoology.json`, `engine_config_calibrated_neet_zoology.json` |

**Purpose:** Calculate REI v17 calibration parameters through iterative refinement

**Execution Example:**
```bash
npx tsx scripts/oracle/neet_physics_iterative_calibration_2021_2025.ts
```

**Calibrated Parameters:**
- **IDS (Item Difficulty Score):** Historical baseline (e.g., 0.894 for Physics)
- **Rigor Velocity:** 2026 trend multiplier (e.g., 1.68)
- **Difficulty Distribution:** Target percentages (e.g., 20/71/9)
- **Board Signature:** Dominant format (e.g., DIAGRAM_FORMULA_MCQ)

**Expected Iterations:** 3-5 until variance < 10%

---

### 3. Phase 6: Question Generation (Shared - All Subjects)

| Script | Purpose | Subjects | Usage |
|--------|---------|----------|-------|
| `phase_generate_flagship_neet.ts` | Generate 45-question sets with strategic differentiation | All (Physics, Chemistry, Botany, Zoology) | Interactive prompts |

**Purpose:** AI-powered generation of flagship questions with SET A/B differentiation

**Execution:**
```bash
npx tsx scripts/oracle/phase_generate_flagship_neet.ts
```

**Interactive Prompts:**
```
Enter subject (Physics, Chemistry, Botany, Zoology): Physics
Enter exam context: NEET
Enter set type (A or B): A
Enter question count: 45
```

**SET A Directive:**
- Formula for CALCULATION
- Emphasis: Computational mastery, numerical problem-solving
- Style: Specific values, multi-step calculations

**SET B Directive:**
- Formula for UNDERSTANDING
- Emphasis: Conceptual relationships, proportionality
- Style: Cause-effect reasoning, graphical interpretation

**Output:**
- 45 questions inserted into database
- Scan ID recorded for Phase 8 export
- Full metadata: solutions, exam tips, mastery material

**Usage Pattern:**
1. Run once for SET A (45 questions)
2. Run again for SET B (45 questions)
3. Total: 90 questions per subject

---

### 4. Phase 7: Quality Verification (Shared - All Subjects)

| Script | Purpose | Subjects | Output |
|--------|---------|----------|--------|
| `phase7_quality_checks_neet.ts` | Automated quality validation | All | Console report with quality metrics |
| `phase7_quality_verification_neet.ts` | Detailed quality report | All | Comprehensive quality analysis |

**Purpose:** Automated validation of generated questions

**Execution:**
```bash
npx tsx scripts/oracle/phase7_quality_checks_neet.ts
```

**Checks Performed:**
1. Question count: 90 (45 SET A + 45 SET B)
2. Content completeness: Text, options, solutions, tips
3. Difficulty distribution: 20/71/9 target (±10% variance)
4. Topic coverage: All NTA topics represented
5. LaTeX formulas: Valid rendering
6. Metadata: All fields populated

**Expected Output:**
```
✅ Question Count: 90 (45 SET A + 45 SET B)
✅ Content Completeness: 100%
✅ Difficulty Variance: 7% (within ±10% threshold)
✅ Topic Coverage: All topics represented
✅ LaTeX Formulas: Valid
✅ Metadata: Complete
```

---

### 5. Phase 7.5: Independent Verification (Shared - All Subjects)

| Script | Purpose | Subjects | Output |
|--------|---------|----------|--------|
| `phase7.5_independent_verification_neet.ts` | Human-in-loop verification | All | Verification report with confidence score |

**Purpose:** Manual review of strategic differentiation and quality

**Execution:**
```bash
npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts
```

**Review Checklist:**
1. SET A vs SET B differentiation clear
2. Formula emphasis vs Understanding emphasis evident
3. Question quality meets NEET standards
4. Solutions accurate and pedagogically sound
5. Exam tips relevant and actionable
6. No duplicate questions between sets

**Confidence Score:** Aim for ≥85/100 (APPROVED)

**Approval Required:** Yes (human decision point)

---

### 6. Phase 8: UI Deployment (Per Subject)

| Script | Purpose | Subject | Output Files |
|--------|---------|---------|--------------|
| `export_neet_physics_flagship.ts` | Export Physics to JSON | Physics | `flagship_neet_physics_2026_set_a.json`, `flagship_neet_physics_2026_set_b.json` |
| `export_neet_chemistry_flagship.ts` | Export Chemistry to JSON | Chemistry | `flagship_neet_chemistry_2026_set_a.json`, `flagship_neet_chemistry_2026_set_b.json` |
| `export_neet_botany_flagship.ts` | Export Botany to JSON | Botany | `flagship_neet_botany_2026_set_a.json`, `flagship_neet_botany_2026_set_b.json` |
| `export_neet_zoology_flagship.ts` | Export Zoology to JSON | Zoology | `flagship_neet_zoology_2026_set_a.json`, `flagship_neet_zoology_2026_set_b.json` |

**Purpose:** Export verified questions to production JSON files

**Execution Example:**
```bash
npx tsx scripts/oracle/export_neet_physics_flagship.ts
```

**Outputs:**
- SET A JSON file (~130 KB, 45 questions)
- SET B JSON file (~125 KB, 45 questions)
- Complete metadata, calibration parameters, strategic focus

**JSON Structure:**
```json
{
  "test_name": "PLUS2AI OFFICIAL NEET PHYSICS PREDICTION 2026: SET A",
  "subject": "Physics",
  "exam_context": "NEET",
  "total_questions": 45,
  "total_marks": 180,
  "description": "SET A: Formula for CALCULATION...",
  "strategic_focus": "Quantitative problem-solving...",
  "calibration": {
    "ids": 0.894,
    "rigor": 1.68,
    "difficulty_distribution": "20/71/9",
    "board_signature": "DIAGRAM_FORMULA_MCQ"
  },
  "test_config": {
    "questions": [...]
  }
}
```

**Validation:**
```bash
jq '.test_name, .total_questions' flagship_neet_physics_2026_set_a.json
jq '.test_name, .total_questions' flagship_neet_physics_2026_set_b.json
```

---

### 7. UI Verification Scripts (Per Subject - Optional)

| Script | Purpose | Subject | Output |
|--------|---------|---------|--------|
| `verify_neet_physics_ui_data.ts` | Verify Physics UI integration | Physics | Console validation report |
| `verify_neet_chemistry_ui_data.ts` | Verify Chemistry UI integration | Chemistry | Console validation report |
| `verify_neet_botany_ui_data.ts` | Verify Botany UI integration | Botany | Console validation report |
| `verify_neet_zoology_ui_data.ts` | Verify Zoology UI integration | Zoology | Console validation report |

**Purpose:** Confirm UI correctly loads the exported JSON files

**Execution Example:**
```bash
npx tsx scripts/verify_neet_physics_ui_data.ts
```

**Expected Output:**
```
🎯 NEET PHYSICS PAPERS:
   neet-physics-a: ✅ FOUND - 45 questions, NEET
   neet-physics-b: ✅ FOUND - 45 questions, NEET

🎉 SUCCESS: NEET Physics SET A has correct 45 questions
🎉 SUCCESS: NEET Physics SET B has correct 45 questions
```

---

### 8. Workflow Alignment & Validation

| Script | Purpose | Subjects | Output |
|--------|---------|----------|--------|
| `verify_neet_workflow_alignment.ts` | Verify end-to-end workflow consistency | All | Alignment verification report |

**Purpose:** Ensure all phases align and data flows correctly

**Execution:**
```bash
npx tsx scripts/oracle/verify_neet_workflow_alignment.ts
```

**Validates:**
- Identity banks → Calibration → Generation → Export pipeline
- Data consistency across phases
- File integrity and question counts

---

### 9. Supporting Analysis Scripts

| Script | Purpose | Subject | Output |
|--------|---------|---------|--------|
| `analyze_neet_chemistry_topics.ts` | Deep dive into Chemistry topics | Chemistry | Topic distribution analysis |
| `validate_neet_physics_question_quality.ts` | Detailed Physics quality check | Physics | Quality metrics report |
| `verify_neet_subject_rankings.ts` | Subject difficulty rankings | All | Comparative difficulty report |
| `analyze_actual_neet_physics_difficulty.ts` | Actual exam difficulty analysis | Physics | Historical difficulty trends |

**Purpose:** Additional analysis for deep insights

**Use Cases:**
- Understanding topic distributions
- Comparing difficulty across subjects
- Validating calibration assumptions

---

## Script Naming Convention

All scripts follow a consistent pattern:

### Pattern 1: Per-Subject Scripts
```
<action>_neet_<subject>_<details>_<timeframe>.ts

Examples:
- analyze_neet_physics_question_types_2021_2025.ts
- build_neet_chemistry_identities_2021_2025.ts
- neet_botany_iterative_calibration_2021_2025.ts
```

### Pattern 2: Shared Scripts
```
<phase>_<action>_neet.ts

Examples:
- phase_generate_flagship_neet.ts
- phase7_quality_checks_neet.ts
- phase7.5_independent_verification_neet.ts
```

### Pattern 3: Verification Scripts
```
verify_neet_<aspect>.ts

Examples:
- verify_neet_scans_2021_2025.ts
- verify_neet_workflow_alignment.ts
- verify_neet_physics_ui_data.ts
```

---

## Quick Start Guide

### For New Subject (e.g., Chemistry)

**Step 1: Verify Historical Data**
```bash
npx tsx scripts/oracle/find_all_neet_scans_2021_2025.ts
npx tsx scripts/oracle/verify_neet_scans_2021_2025.ts
```

**Step 2: Run Calibration (Phase 1-4)**
```bash
npx tsx scripts/oracle/analyze_neet_chemistry_question_types_2021_2025.ts
npx tsx scripts/oracle/build_neet_chemistry_identities_2021_2025.ts
npx tsx scripts/oracle/neet_chemistry_iterative_calibration_2021_2025.ts
```

**Step 3: Generate Questions (Phase 6)**
```bash
# Run twice: once for SET A, once for SET B
npx tsx scripts/oracle/phase_generate_flagship_neet.ts
```

**Step 4: Verify Quality (Phase 7 & 7.5)**
```bash
npx tsx scripts/oracle/phase7_quality_checks_neet.ts
npx tsx scripts/oracle/phase7_quality_verification_neet.ts
npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts
```

**Step 5: Export to JSON (Phase 8)**
```bash
npx tsx scripts/oracle/export_neet_chemistry_flagship.ts
npx tsx scripts/verify_neet_chemistry_ui_data.ts
```

**Total Time:** ~5-6 hours for complete workflow

---

## Output Directory Structure

```
project_root/
├── lib/oracle/identities/
│   ├── neet_physics.json           (180 identities)
│   ├── neet_chemistry.json         (180 identities)
│   ├── neet_botany.json            (180 identities)
│   └── neet_zoology.json           (180 identities)
│
├── docs/oracle/
│   ├── QUESTION_TYPE_ANALYSIS_2021_2025_PHYSICS.json
│   ├── QUESTION_TYPE_ANALYSIS_2021_2025_CHEMISTRY.json
│   ├── QUESTION_TYPE_ANALYSIS_2021_2025_BOTANY.json
│   └── QUESTION_TYPE_ANALYSIS_2021_2025_ZOOLOGY.json
│
├── docs/oracle/calibration/
│   ├── identity_confidences_neet_physics.json
│   ├── identity_confidences_neet_chemistry.json
│   ├── identity_confidences_neet_botany.json
│   ├── identity_confidences_neet_zoology.json
│   ├── engine_config_calibrated_neet_physics.json
│   ├── engine_config_calibrated_neet_chemistry.json
│   ├── engine_config_calibrated_neet_botany.json
│   ├── engine_config_calibrated_neet_zoology.json
│   └── [Phase Reports]
│
└── [project root]
    ├── flagship_neet_physics_2026_set_a.json
    ├── flagship_neet_physics_2026_set_b.json
    ├── flagship_neet_chemistry_2026_set_a.json
    ├── flagship_neet_chemistry_2026_set_b.json
    ├── flagship_neet_botany_2026_set_a.json
    ├── flagship_neet_botany_2026_set_b.json
    ├── flagship_neet_zoology_2026_set_a.json
    └── flagship_neet_zoology_2026_set_b.json
```

---

## Environment Variables Required

All scripts require these environment variables (in `.env` file):

```env
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-key>
GEMINI_API_KEY=<your-gemini-api-key>  # For Phase 6 generation
```

---

## Best Practices

### 1. Always Verify Before Proceeding

Run verification scripts before each phase:
```bash
# Before Phase 1
npx tsx scripts/oracle/verify_neet_scans_2021_2025.ts

# After Phase 6
npx tsx scripts/oracle/phase7_quality_checks_neet.ts

# After Phase 8
npx tsx scripts/verify_neet_physics_ui_data.ts
```

### 2. Document All Outputs

Save console outputs to documentation files:
```bash
npx tsx scripts/oracle/analyze_neet_physics_question_types_2021_2025.ts > docs/oracle/calibration/PHASE1_ANALYSIS_OUTPUT.txt
```

### 3. Version Control Commits

Commit after each major phase:
```bash
git add .
git commit -m "feat: complete Phase 1-4 calibration for NEET Chemistry"
```

### 4. Backup Identity Banks

Identity banks are critical - back them up:
```bash
cp lib/oracle/identities/neet_physics.json lib/oracle/identities/neet_physics_backup_$(date +%Y%m%d).json
```

---

## Troubleshooting

### Script Fails to Find Questions

**Error:** "Expected 450 questions, found 0"

**Solution:**
1. Verify database connection (check `.env` file)
2. Check `examContext` field in database: should be "NEET"
3. Run `npx tsx scripts/oracle/find_all_neet_scans_2021_2025.ts` to verify data

### Identity Count Not 180

**Error:** "Built 150 identities, expected 180"

**Solution:**
1. Some years may have fewer questions
2. Adjust script to balance across available years
3. Minimum 3 years required (135 identities)

### Calibration Variance Too High

**Error:** "Variance: 15% (exceeds 10% threshold)"

**Solution:**
1. Run additional iterations
2. Exclude outlier years if necessary
3. Check if identity bank is representative

### Export Script Fails

**Error:** "Expected 90 questions, got 45"

**Solution:**
1. Verify you ran Phase 6 generation twice (SET A and SET B)
2. Check scan ID is correct
3. Verify both sets were inserted into database

---

## Production Checklist

Before marking a subject as PRODUCTION READY:

- [ ] 180 identities built (`lib/oracle/identities/neet_<subject>.json`)
- [ ] Calibration complete (IDS, rigor, distribution, signature calculated)
- [ ] 90 questions generated (45 SET A + 45 SET B)
- [ ] Quality checks passed (variance < 10%, completeness ≥ 95%)
- [ ] Independent verification ≥ 85/100
- [ ] JSON files exported and validated
- [ ] UI integration complete (frontend + backend)
- [ ] UI displays "45 Qs" correctly
- [ ] All phase reports documented
- [ ] Git commit created with proper message

---

## Contact & Maintenance

**Script Maintainer:** REI v17 Calibration System Team
**Last Validated:** April 30, 2026 (NEET Physics 2026)
**Production Status:** ✅ Ready for all NEET subjects
**Template:** `NEET_SUBJECT_WORKFLOW_TEMPLATE.md` (comprehensive guide)

For issues or enhancements, refer to:
- Workflow Template: `docs/oracle/calibration/NEET_SUBJECT_WORKFLOW_TEMPLATE.md`
- Master Index: `docs/oracle/calibration/MASTER_INDEX.md`
- Phase Reports: `docs/oracle/calibration/NEET_<SUBJECT>_*_REPORT.md`

---

**END OF DOCUMENTATION**
