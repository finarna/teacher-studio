# NEET Subject Flagship Generation - Reusable Workflow Template

**Version:** 1.0 (REI v17 Calibration System)
**Template Based On:** NEET Physics 2026 (Phases 1-8 COMPLETE)
**Status:** Production-Ready Template for All NEET Subjects
**Last Updated:** April 30, 2026

---

## Overview

This template provides a complete, step-by-step workflow for generating flagship prediction papers for any NEET subject using the REI v17 calibration system. All scripts are parameterized and reusable.

### Supported NEET Subjects

| Subject | Question Count | Marks per Question | Total Marks |
|---------|---------------|-------------------|-------------|
| Physics | 45 (45 SET A + 45 SET B = 90 total) | 4 | 180 per set |
| Chemistry | 45 (45 SET A + 45 SET B = 90 total) | 4 | 180 per set |
| Botany | 45 (45 SET A + 45 SET B = 90 total) | 4 | 180 per set |
| Zoology | 45 (45 SET A + 45 SET B = 90 total) | 4 | 180 per set |

**Total NEET 2026:** 180 questions (720 marks) across 4 subjects

---

## Phase Structure

```
Phase 1-4: Calibration (Historical Analysis)
    ↓
Phase 6: Question Generation (AI Generation with Strategic Differentiation)
    ↓
Phase 7: Quality Verification (Automated Checks)
    ↓
Phase 7.5: Independent Verification (Human-in-Loop Review)
    ↓
Phase 8: UI Deployment (JSON Export + Frontend/Backend Integration)
    ↓
Phase 9: Cleanup & Finalization (Optional Documentation Cleanup)
    ↓
Phase 10: Post-Exam Forensic Audit (After Exam Date)
```

---

## Prerequisites

### 1. Historical Data

Ensure NEET question scans exist for 2021-2025 (5 years minimum):

```bash
# Verify scans exist
npx tsx scripts/oracle/find_all_neet_scans_2021_2025.ts
npx tsx scripts/oracle/verify_neet_scans_2021_2025.ts
```

**Expected Output:**
- ~90 questions per year × 5 years = ~450 questions per subject
- All questions properly tagged with `examContext: "NEET"`, `year`, `subject`

### 2. NTA Syllabus Mapping

Verify NTA official topics are mapped for the subject:

```bash
# Check syllabus mapping
npx tsx scripts/oracle/check_neet_data.ts
```

### 3. Environment Setup

Required dependencies:
- Database access (Supabase/PostgreSQL)
- AI model access (Gemini 3 Flash Preview or equivalent)
- Node.js environment with TypeScript support

---

## Phase 1-4: Calibration (Historical Analysis)

**Duration:** ~2-3 hours
**Scripts Involved:** 3 scripts per subject

### Step 1.1: Analyze Question Types (2021-2025)

**Script:** `scripts/oracle/analyze_neet_<subject>_question_types_2021_2025.ts`

**Purpose:** Analyze historical question type distribution to understand board signature

**Example (Replace `<subject>` with `physics`, `chemistry`, `botany`, or `zoology`):**
```bash
npx tsx scripts/oracle/analyze_neet_physics_question_types_2021_2025.ts
```

**Outputs:**
- Console report showing question type distribution
- Identifies dominant patterns (e.g., "DIAGRAM_FORMULA_MCQ")
- JSON file: `docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_<SUBJECT>.json`

**Key Metrics to Record:**
- Dominant question type (e.g., simple_recall_mcq: 78%)
- Board signature pattern
- Year-over-year trend

### Step 1.2: Build Identity Bank

**Script:** `scripts/oracle/build_neet_<subject>_identities_2021_2025.ts`

**Purpose:** Create topic-wise representative question identities from 2021-2025 data

**Example:**
```bash
npx tsx scripts/oracle/build_neet_physics_identities_2021_2025.ts
```

**Outputs:**
- Identity bank: `lib/oracle/identities/neet_<subject>.json`
- Contains 180 representative questions (36 per year × 5 years)
- Organized by topic with difficulty distribution

**Validation:**
```bash
# Verify identity count
jq '.identities | length' lib/oracle/identities/neet_physics.json
# Expected: 180
```

### Step 1.3: Iterative Calibration

**Script:** `scripts/oracle/neet_<subject>_iterative_calibration_2021_2025.ts`

**Purpose:** Calculate calibration parameters through iterative refinement

**Example:**
```bash
npx tsx scripts/oracle/neet_physics_iterative_calibration_2021_2025.ts
```

**Outputs:**
- Calibrated parameters:
  - **IDS (Item Difficulty Score):** Historical difficulty baseline (e.g., 0.894)
  - **Rigor Velocity:** Trend multiplier for 2026 predictions (e.g., 1.68)
  - **Difficulty Distribution:** Target percentages (e.g., 20/71/9)
  - **Board Signature:** Dominant question format (e.g., DIAGRAM_FORMULA_MCQ)

- Confidence files:
  - `docs/oracle/calibration/identity_confidences_neet_<subject>.json`
  - `docs/oracle/calibration/engine_config_calibrated_neet_<subject>.json`

**Expected Iterations:** 3-5 iterations until variance < 10%

**Completion Criteria:**
- ✅ IDS calculated with confidence > 85%
- ✅ Difficulty distribution variance < 10%
- ✅ Board signature identified
- ✅ 180 identities validated

---

## Phase 6: Question Generation

**Duration:** ~1 hour
**AI Model:** Gemini 3 Flash Preview (or equivalent)

### Step 6.1: Generate SET A (Formula for CALCULATION)

**Script:** `scripts/oracle/phase_generate_flagship_neet.ts`

**Purpose:** Generate 45 questions emphasizing computational mastery

**Execution:**
```bash
npx tsx scripts/oracle/phase_generate_flagship_neet.ts
```

**Interactive Prompts:**
- Subject: `Physics` (or Chemistry, Botany, Zoology)
- Exam Context: `NEET`
- Set Type: `A`
- Count: `45`

**Generation Directive for SET A:**
```
SET A: Formula for CALCULATION

Strategic Focus:
- Quantitative problem-solving with specific numerical values
- Multi-step calculations requiring formula application
- Substitution of given values into formulas
- Unit conversions and algebraic manipulation
- Numerical precision in answers

Question Style Examples:
- "A particle of mass 0.5 kg moving at 20 m/s... Calculate the final velocity."
- "If resistance R = 10Ω and current I = 2A, find power dissipated."
- "Given half-life = 5730 years, calculate remaining mass after 11460 years."
```

**Output:**
- 45 questions inserted into database
- Scan ID recorded (e.g., `2adcb415-9410-4468-b8f3-32206e5ae7cb`)
- Each question has: text, options, solution steps, exam tips, mastery material

### Step 6.2: Generate SET B (Formula for UNDERSTANDING)

**Script:** Same as above, different prompts

**Execution:**
```bash
npx tsx scripts/oracle/phase_generate_flagship_neet.ts
```

**Interactive Prompts:**
- Subject: `Physics` (or Chemistry, Botany, Zoology)
- Exam Context: `NEET`
- Set Type: `B`
- Count: `45`

**Generation Directive for SET B:**
```
SET B: Formula for UNDERSTANDING

Strategic Focus:
- Understanding physical/chemical relationships
- Proportionality and dependencies in equations
- Cause-effect reasoning ("if X doubles, what happens to Y?")
- Graphical interpretation of formula relationships
- Limiting cases and boundary conditions

Question Style Examples:
- "According to F=ma, if mass doubles while force stays constant, acceleration will..."
- "In the equation PV=nRT, keeping T and n constant, if pressure doubles, volume will..."
- "Which graph correctly represents the relationship between resistance and temperature?"
```

**Output:**
- 45 additional questions (total 90 in same scan)
- Strategic differentiation embedded in question metadata

---

## Phase 7: Quality Verification

**Duration:** ~30 minutes
**Scripts Involved:** 2 scripts

### Step 7.1: Automated Quality Checks

**Script:** `scripts/oracle/phase7_quality_checks_neet.ts`

**Purpose:** Automated validation of question quality and distribution

**Execution:**
```bash
npx tsx scripts/oracle/phase7_quality_checks_neet.ts
```

**Checks Performed:**
1. Question count: 90 total (45 SET A + 45 SET B)
2. Content completeness: Text, options, correct answers, solutions
3. Difficulty distribution: 20/71/9 target (±10% variance acceptable)
4. Topic coverage: All major topics represented
5. LaTeX rendering: Formulas properly formatted
6. Metadata presence: All fields populated

**Output:**
```
✅ Question Count: 90 (45 SET A + 45 SET B)
✅ Content Completeness: 100%
✅ Difficulty Variance: 7% (within ±10% threshold)
✅ Topic Coverage: All topics represented
✅ LaTeX Formulas: Valid
✅ Metadata: Complete
```

### Step 7.2: Quality Verification Report

**Script:** `scripts/oracle/phase7_quality_verification_neet.ts`

**Purpose:** Generate detailed quality metrics report

**Execution:**
```bash
npx tsx scripts/oracle/phase7_quality_verification_neet.ts
```

**Output:**
- Detailed report with quality scores
- Difficulty breakdown by tier (Easy/Moderate/Hard)
- Topic distribution analysis
- LaTeX formula validation
- Completeness percentage

---

## Phase 7.5: Independent Verification

**Duration:** ~1 hour
**Human-in-Loop:** Manual review required

### Step 7.5.1: Independent Verification

**Script:** `scripts/oracle/phase7.5_independent_verification_neet.ts`

**Purpose:** Human verification of strategic differentiation and quality

**Execution:**
```bash
npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts
```

**Review Checklist:**
1. ✅ SET A vs SET B differentiation clear
2. ✅ Formula emphasis vs Understanding emphasis evident
3. ✅ Question quality meets NEET standards
4. ✅ Solutions accurate and pedagogically sound
5. ✅ Exam tips relevant and actionable
6. ✅ No duplicate questions between sets

**Confidence Score:** Aim for ≥85/100 (APPROVED)

**Approval Required:** Yes (human decision point)

**Documentation:**
- Save verification report: `docs/oracle/calibration/NEET_<SUBJECT>_PHASE7.5_COMPLETION_REPORT.md`

---

## Phase 8: UI Deployment

**Duration:** ~30 minutes
**Scripts Involved:** 1 script + 3 file modifications

### Step 8.1: Export to JSON

**Script:** `scripts/oracle/export_neet_<subject>_flagship.ts`

**Purpose:** Export 90 questions to production JSON files

**Template Script (Replace `<subject>` with actual subject):**
```typescript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const SCAN_ID = '<your-scan-id>'; // From Phase 6
const SUBJECT = 'Physics'; // Or Chemistry, Botany, Zoology
const EXAM_CONTEXT = 'NEET';

async function exportFlagship() {
    // Fetch all 90 questions
    const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('scanId', SCAN_ID)
        .order('created_at', { ascending: true });

    if (!questions || questions.length !== 90) {
        throw new Error(`Expected 90 questions, got ${questions?.length || 0}`);
    }

    // Split into SET A and SET B
    const setA = questions.slice(0, 45);
    const setB = questions.slice(45, 90);

    // Calculate difficulty distribution
    const calcDiffDist = (set: any[]) => {
        const easy = set.filter(q => q.difficulty === 'Easy').length;
        const moderate = set.filter(q => q.difficulty === 'Moderate').length;
        const hard = set.filter(q => q.difficulty === 'Hard').length;
        return `${Math.round((easy/45)*100)}/${Math.round((moderate/45)*100)}/${Math.round((hard/45)*100)}`;
    };

    // Format SET A JSON
    const setAJson = {
        test_name: `PLUS2AI OFFICIAL NEET ${SUBJECT.toUpperCase()} PREDICTION 2026: SET A`,
        subject: SUBJECT,
        exam_context: EXAM_CONTEXT,
        total_questions: 45,
        total_marks: 180,
        description: "SET A: Formula for CALCULATION - Emphasis on computational mastery and numerical problem-solving",
        strategic_focus: "Quantitative problem-solving, multi-step calculations, numerical accuracy, formula application",
        calibration: {
            ids: 0.894, // Replace with actual calibrated value
            rigor: 1.68, // Replace with actual calibrated value
            difficulty_distribution: calcDiffDist(setA),
            board_signature: "DIAGRAM_FORMULA_MCQ" // Replace with actual signature
        },
        test_config: {
            questions: setA.map(q => ({
                id: q.id,
                text: q.text,
                options: q.options,
                marks: q.marks || 4,
                difficulty: q.difficulty,
                topic: q.topic,
                subject: q.subject,
                examContext: q.examContext,
                blooms: q.blooms,
                solutionSteps: q.solutionSteps,
                examTip: q.examTip,
                studyTip: q.studyTip,
                masteryMaterial: q.masteryMaterial,
                keyFormulas: q.keyFormulas,
                thingsToRemember: q.thingsToRemember,
                questionVariations: q.questionVariations,
                correct_option_index: q.correctOptionIndex,
                metadata: q.metadata
            }))
        }
    };

    // Format SET B JSON (similar structure, different description)
    const setBJson = {
        ...setAJson,
        test_name: `PLUS2AI OFFICIAL NEET ${SUBJECT.toUpperCase()} PREDICTION 2026: SET B`,
        description: "SET B: Formula for UNDERSTANDING - Emphasis on conceptual relationships and physical meaning",
        strategic_focus: "Understanding proportionality, cause-effect relationships, graphical interpretation, limiting cases",
        calibration: {
            ...setAJson.calibration,
            difficulty_distribution: calcDiffDist(setB)
        },
        test_config: {
            questions: setB.map(q => ({ /* same mapping as SET A */ }))
        }
    };

    // Write to files
    fs.writeFileSync(
        `flagship_neet_${SUBJECT.toLowerCase()}_2026_set_a.json`,
        JSON.stringify(setAJson, null, 2)
    );
    fs.writeFileSync(
        `flagship_neet_${SUBJECT.toLowerCase()}_2026_set_b.json`,
        JSON.stringify(setBJson, null, 2)
    );

    console.log('✅ Export complete!');
    console.log(`   SET A: flagship_neet_${SUBJECT.toLowerCase()}_2026_set_a.json`);
    console.log(`   SET B: flagship_neet_${SUBJECT.toLowerCase()}_2026_set_b.json`);
}

exportFlagship();
```

**Execution:**
```bash
npx tsx scripts/oracle/export_neet_physics_flagship.ts
```

**Outputs:**
- `flagship_neet_<subject>_2026_set_a.json` (~130 KB, 45 questions)
- `flagship_neet_<subject>_2026_set_b.json` (~125 KB, 45 questions)

**Validation:**
```bash
# Verify JSON structure
jq '.test_name, .total_questions' flagship_neet_physics_2026_set_a.json
jq '.test_name, .total_questions' flagship_neet_physics_2026_set_b.json
```

### Step 8.2: Frontend Integration

**File:** `utils/predictedPapersData.ts`

**Changes Required:**

1. Import JSON files (add at top):
```typescript
// NEET 2026 Flagship Papers - <Subject>
import neet<Subject>SetA from '../flagship_neet_<subject>_2026_set_a.json';
import neet<Subject>SetB from '../flagship_neet_<subject>_2026_set_b.json';
```

2. Add papers to array (in `getPredictedPapers()` function):
```typescript
// NEET 2026 Papers - <Subject>
{
    id: 'neet-<subject>-a',
    title: 'PLUS2AI OFFICIAL NEET <SUBJECT> PREDICTION 2026: SET-A',
    subject: '<Subject>',
    setName: 'A',
    examContext: 'NEET',
    questions: (neet<Subject>SetA as any).test_config?.questions || []
},
{
    id: 'neet-<subject>-b',
    title: 'PLUS2AI OFFICIAL NEET <SUBJECT> PREDICTION 2026: SET-B',
    subject: '<Subject>',
    setName: 'B',
    examContext: 'NEET',
    questions: (neet<Subject>SetB as any).test_config?.questions || []
}
```

**Example for Chemistry:**
```typescript
import neetChemistrySetA from '../flagship_neet_chemistry_2026_set_a.json';
import neetChemistrySetB from '../flagship_neet_chemistry_2026_set_b.json';

{
    id: 'neet-chemistry-a',
    title: 'PLUS2AI OFFICIAL NEET CHEMISTRY PREDICTION 2026: SET-A',
    subject: 'Chemistry',
    setName: 'A',
    examContext: 'NEET',
    questions: (neetChemistrySetA as any).test_config?.questions || []
},
```

### Step 8.3: Backend Integration

**File:** `api/learningJourneyEndpoints.js`

**Changes Required:**

**1. Test Creation Endpoint (~Line 2303):**

Add condition for your subject (follow pattern for Physics):
```javascript
} else if (isChemistry) {
    // Check exam context for NEET vs KCET Chemistry
    if (examContext === 'NEET') {
        sourceFile = normalizedSetId === 'SET-B' ?
            'flagship_neet_chemistry_2026_set_b.json' :
            'flagship_neet_chemistry_2026_set_a.json';
    } else {
        sourceFile = normalizedSetId === 'SET-B' ?
            'flagship_chemistry_final_b.json' :
            'flagship_chemistry_final.json';
    }
}
```

**2. Official Tests Endpoint (~Line 2600):**

Add condition for your subject:
```javascript
} else if (isChemistry) {
    if (examContext === 'NEET') {
        flagships = [
            { id: 'SET-A', file: 'flagship_neet_chemistry_2026_set_a.json', label: 'Chemistry Set-A Prediction' },
            { id: 'SET-B', file: 'flagship_neet_chemistry_2026_set_b.json', label: 'Chemistry Set-B Prediction' }
        ];
    } else {
        flagships = [
            { id: 'SET-A', file: 'flagship_chemistry_final.json', label: 'Chemistry Set-A Prediction' },
            { id: 'SET-B', file: 'flagship_chemistry_final_b.json', label: 'Chemistry Set-B Prediction' }
        ];
    }
}
```

**Note:** The dynamic `total_questions` reading (Line 2627-2658) is already in place and will work automatically for all subjects.

### Step 8.4: Verification

**Script:** `scripts/verify_neet_<subject>_ui_data.ts`

**Purpose:** Verify UI correctly displays the new subject

**Template:**
```typescript
import { getPredictedPapers } from '../utils/predictedPapersData';

console.log('\\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║          VERIFYING NEET <SUBJECT> UI DATA INTEGRATION              ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\\n');

const papers = getPredictedPapers();

const neet<Subject>A = papers.find(p => p.id === 'neet-<subject>-a');
const neet<Subject>B = papers.find(p => p.id === 'neet-<subject>-b');

console.log('🎯 NEET <SUBJECT> PAPERS:');
console.log(`   neet-<subject>-a: ${neet<Subject>A ? `✅ FOUND - ${neet<Subject>A.questions.length} questions` : '❌ NOT FOUND'}`);
console.log(`   neet-<subject>-b: ${neet<Subject>B ? `✅ FOUND - ${neet<Subject>B.questions.length} questions` : '❌ NOT FOUND'}`);

if (neet<Subject>A && neet<Subject>A.questions.length === 45) {
    console.log('🎉 SUCCESS: NEET <Subject> SET A has correct 45 questions');
} else {
    console.log(`⚠️  WARNING: NEET <Subject> SET A has ${neet<Subject>A?.questions.length || 0} questions (expected 45)`);
}

if (neet<Subject>B && neet<Subject>B.questions.length === 45) {
    console.log('🎉 SUCCESS: NEET <Subject> SET B has correct 45 questions');
} else {
    console.log(`⚠️  WARNING: NEET <Subject> SET B has ${neet<Subject>B?.questions.length || 0} questions (expected 45)`);
}
```

**Execution:**
```bash
npx tsx scripts/verify_neet_chemistry_ui_data.ts
```

**Expected Output:**
```
🎯 NEET CHEMISTRY PAPERS:
   neet-chemistry-a: ✅ FOUND - 45 questions, NEET
   neet-chemistry-b: ✅ FOUND - 45 questions, NEET

🎉 SUCCESS: NEET Chemistry SET A has correct 45 questions
🎉 SUCCESS: NEET Chemistry SET B has correct 45 questions
```

---

## Phase 9: Cleanup & Finalization (Optional)

**Duration:** ~15 minutes

### Step 9.1: Archive Temporary Files

```bash
# Move iteration logs to archive
mkdir -p docs/oracle/calibration/archive/<subject>_2026
mv docs/oracle/calibration/<SUBJECT>_*_ITERATION_LOG.md docs/oracle/calibration/archive/<subject>_2026/
```

### Step 9.2: Update Master Index

**File:** `docs/oracle/calibration/MASTER_INDEX.md`

Add entry for new subject:
```markdown
### NEET <Subject> 2026
- [Calibration Report](./NEET_<SUBJECT>_CALIBRATION_REPORT_2021_2025.md)
- [Question Type Analysis](../QUESTION_TYPE_ANALYSIS_2021_2025_<SUBJECT>.json)
- [Phase 7 Quality Report](./NEET_<SUBJECT>_PHASE7_COMPLETION_REPORT.md)
- [Phase 7.5 Verification](./NEET_<SUBJECT>_PHASE7.5_COMPLETION_REPORT.md)
- [Phase 8 UI Deployment](./NEET_<SUBJECT>_PHASE8_UI_DEPLOYMENT_REPORT.md)
- [Master Report](./NEET_<SUBJECT>_2026_FLAGSHIP_MASTER_REPORT.md)
```

### Step 9.3: Git Commit

```bash
git add .
git commit -m "feat: complete NEET <Subject> 2026 flagship generation (Phases 1-8)

- Calibrated REI v17 parameters from 2021-2025 data
- Generated 90 questions (45 SET A + 45 SET B)
- Strategic differentiation: CALCULATION vs UNDERSTANDING
- UI integration complete with exam context routing
- Quality verified: 7% variance (within threshold)

Files:
- flagship_neet_<subject>_2026_set_a.json (45 questions)
- flagship_neet_<subject>_2026_set_b.json (45 questions)
- lib/oracle/identities/neet_<subject>.json (180 identities)
- Documentation reports (Phases 1-8)

Co-Authored-By: REI v17 Calibration System <noreply@plus2ai.com>"
```

---

## Phase 10: Post-Exam Forensic Audit

**Duration:** ~2 hours
**Timeline:** After NEET 2026 exam (May 8, 2026)

### Step 10.1: Scan Actual Exam

Obtain and scan actual NEET 2026 exam paper for the subject.

### Step 10.2: Run Forensic Comparison

**Script:** `scripts/oracle/phase10_forensic_audit_neet.ts` (to be created)

**Purpose:** Compare predicted questions vs actual exam

**Metrics Calculated:**
- **Tier 1 Match:** Exact question match (text + options identical)
- **Tier 2 Match:** Topic + concept match (similar question, different numbers)
- **Tier 3 Match:** Topic match (same topic, different concept)
- **Overall Accuracy:** % of predicted questions that appeared in some form

**Output:**
- Forensic audit report: `docs/oracle/calibration/NEET_<SUBJECT>_2026_FORENSIC_AUDIT_REPORT.md`
- Accuracy metrics for updating calibration for NEET 2027

---

## Script Organization

All NEET-related scripts are in `scripts/oracle/` directory:

### Phase 1-4 Scripts (Per Subject)
```
analyze_neet_<subject>_question_types_2021_2025.ts
build_neet_<subject>_identities_2021_2025.ts
neet_<subject>_iterative_calibration_2021_2025.ts
```

### Phase 6 Script (Shared)
```
phase_generate_flagship_neet.ts  (Used for all subjects)
```

### Phase 7 Scripts (Shared)
```
phase7_quality_checks_neet.ts
phase7_quality_verification_neet.ts
```

### Phase 7.5 Script (Shared)
```
phase7.5_independent_verification_neet.ts
```

### Phase 8 Scripts (Per Subject)
```
export_neet_<subject>_flagship.ts
verify_neet_<subject>_ui_data.ts  (optional verification)
```

### Utility Scripts (Shared)
```
find_all_neet_scans_2021_2025.ts
verify_neet_scans_2021_2025.ts
check_neet_data.ts
check_all_neet_data.ts
verify_neet_workflow_alignment.ts
```

---

## Quick Reference: Subject Substitution

When using this template, replace placeholders:

| Placeholder | Physics | Chemistry | Botany | Zoology |
|-------------|---------|-----------|--------|---------|
| `<subject>` | `physics` | `chemistry` | `botany` | `zoology` |
| `<Subject>` | `Physics` | `Chemistry` | `Botany` | `Zoology` |
| `<SUBJECT>` | `PHYSICS` | `CHEMISTRY` | `BOTANY` | `ZOOLOGY` |

---

## Quality Gates Summary

| Phase | Quality Gate | Target | How to Verify |
|-------|-------------|--------|---------------|
| 1-4 | Identity count | 180 | `jq '.identities \| length' lib/oracle/identities/neet_<subject>.json` |
| 1-4 | IDS confidence | ≥85% | Check calibration script output |
| 1-4 | Variance | <10% | Check calibration report |
| 6 | Question count | 90 (45+45) | Database query or export script output |
| 7 | Content completeness | ≥95% | Phase 7 quality checks script |
| 7 | Difficulty variance | ≤10% | Phase 7 quality verification |
| 7.5 | Human approval | ≥85/100 | Manual review score |
| 8 | JSON validity | Valid | `jq '.' <file>` returns without error |
| 8 | UI badge count | 45 Qs | Visual inspection in UI |

---

## Time Estimates

| Phase | Duration | Complexity |
|-------|----------|-----------|
| 1-4: Calibration | 2-3 hours | Medium (mostly automated) |
| 6: Generation | 1 hour | Low (AI-driven) |
| 7: Quality Checks | 30 minutes | Low (automated) |
| 7.5: Independent Verification | 1 hour | Medium (human review) |
| 8: UI Deployment | 30 minutes | Low (templated) |
| 9: Cleanup | 15 minutes | Low (optional) |
| **Total** | **~5-6 hours** | - |

---

## Success Criteria

A subject is considered **PRODUCTION READY** when:

- ✅ 180 identities built from 2021-2025 data
- ✅ Calibration parameters calculated (IDS, rigor, distribution, signature)
- ✅ 90 questions generated (45 SET A + 45 SET B)
- ✅ Strategic differentiation documented (CALCULATION vs UNDERSTANDING)
- ✅ Quality variance < 10%
- ✅ Content completeness ≥ 95%
- ✅ Human verification ≥ 85/100
- ✅ JSON files exported and validated
- ✅ Frontend and backend integration complete
- ✅ UI displays correct question count (45 Qs)
- ✅ Documentation complete (all phase reports)

---

## Troubleshooting

### Issue: UI shows wrong question count

**Symptom:** Mock Test Builder displays "60 Qs" instead of "45 Qs"

**Root Cause:** API hardcoding `total_questions: 60`

**Solution:** Verify API reads from JSON files dynamically (line ~2627-2658 in `api/learningJourneyEndpoints.js`)

### Issue: Questions not loading in test

**Symptom:** Test starts but shows 0 questions

**Root Cause:** Backend routing to wrong JSON files

**Solution:** Verify exam context routing in API (line ~2303-2309 and ~2600-2612)

### Issue: Export script fails

**Symptom:** Script crashes with "Expected 90 questions, got X"

**Root Cause:** Questions not properly generated in Phase 6

**Solution:** Re-run Phase 6 generation script, verify scan ID

### Issue: Calibration variance too high

**Symptom:** Difficulty distribution variance > 10%

**Root Cause:** Insufficient historical data or outlier years

**Solution:** Run additional calibration iterations, consider excluding outlier years

---

## Contact & Support

**REI v17 Calibration System Documentation:** `docs/oracle/calibration/`
**Template Version:** 1.0 (Based on NEET Physics 2026 success)
**Last Validated:** April 30, 2026

---

**END OF TEMPLATE**
