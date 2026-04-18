# Repeatable REI v17 Calibration Workflow

**Purpose:** Complete end-to-end guide to calibrate any subject/exam and deploy to production UI
**Time Required:** 6-8 hours per subject (including UI deployment)
**Difficulty:** Medium
**Last Updated:** 2026-04-18
**Coverage:** 9 phases from historical data to student-facing mock tests

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Data Preparation](#phase-1-data-preparation)
3. [Phase 2: Calibration Execution](#phase-2-calibration-execution)
4. [Phase 3: Question Type Analysis](#phase-3-question-type-analysis)
5. [Phase 4: Database Configuration](#phase-4-database-configuration)
6. [Phase 5: Generator Setup](#phase-5-generator-setup)
7. [Phase 6: Flagship Generation](#phase-6-flagship-generation)
8. [Phase 7: Quality Verification](#phase-7-quality-verification)
9. [Phase 8: UI Deployment](#phase-8-ui-deployment)
10. [Phase 9: Cleanup & Finalization](#phase-9-cleanup--finalization)
11. [Troubleshooting](#troubleshooting)
12. [Quality Checklist](#quality-checklist)

---

## Prerequisites

### Required Tools
- [x] Node.js 18+ installed
- [x] TypeScript compiler (`npx tsx`)
- [x] Database access (PostgreSQL + Supabase)
- [x] Git for version control
- [x] Text editor (VS Code recommended)

### Required Data
- [x] 5 years of official exam papers (2021-2025)
- [x] Papers scanned and OCR'd
- [x] Questions extracted with:
  - Text, options, correct answer
  - Difficulty level (Easy/Moderate/Hard)
  - Topic classification
  - Year and source

### Required Access
- [x] Database admin access
- [x] API keys: `GEMINI_API_KEY` or `VITE_GEMINI_API_KEY`
- [x] Write access to `lib/oracle/identities/`
- [x] Write access to `docs/oracle/`

### Environment Variables
```bash
# .env.local
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
```

---

## Phase 1: Data Preparation

**Time:** 1-2 hours
**Output:** Questions in database with proper tags

### Step 1.1: Verify Historical Data

```bash
# Check data exists in database
psql -d your_db -c "
  SELECT
    subject,
    exam_context,
    year,
    COUNT(*) as question_count
  FROM questions
  WHERE subject = 'YOUR_SUBJECT'
    AND exam_context = 'YOUR_EXAM'
    AND year BETWEEN 2021 AND 2025
  GROUP BY subject, exam_context, year
  ORDER BY year;
"
```

**Expected Output:**
```
subject | exam_context | year | question_count
--------|--------------|------|----------------
Biology | KCET         | 2021 | 60
Biology | KCET         | 2022 | 60
Biology | KCET         | 2023 | 60
Biology | KCET         | 2024 | 60
Biology | KCET         | 2025 | 60
```

**If data is missing:**
- Scan and extract questions from official papers
- Import into database using OCR tools
- Ensure difficulty and topic fields are populated

### Step 1.2: Verify Topic Metadata

```bash
# Check topics are defined
psql -d your_db -c "
  SELECT
    id,
    name,
    subject,
    exam_context
  FROM topics
  WHERE subject = 'YOUR_SUBJECT'
    AND exam_context = 'YOUR_EXAM'
  ORDER BY name;
"
```

**If topics missing:**
1. Create topic list from syllabus
2. Insert into `topics` table
3. Update questions with proper topic references

### Step 1.3: Validate Question Quality

```bash
# Check for missing fields
psql -d your_db -c "
  SELECT
    COUNT(*) FILTER (WHERE text IS NULL) as missing_text,
    COUNT(*) FILTER (WHERE difficulty IS NULL) as missing_difficulty,
    COUNT(*) FILTER (WHERE topic IS NULL) as missing_topic,
    COUNT(*) FILTER (WHERE options IS NULL OR array_length(options, 1) != 4) as bad_options,
    COUNT(*) as total
  FROM questions
  WHERE subject = 'YOUR_SUBJECT'
    AND exam_context = 'YOUR_EXAM'
    AND year BETWEEN 2021 AND 2025;
"
```

**All counts should be 0 except total (300)**

---

## Phase 2: Calibration Execution

**Time:** 2-3 hours
**Output:** Identity bank JSON + Calibration report

### Step 2.1: Create Calibration Script

```bash
# Copy template
cp scripts/oracle/kcet_chemistry_iterative_calibration_2021_2025_v2.ts \
   scripts/oracle/${EXAM_LOWER}_${SUBJECT_LOWER}_iterative_calibration_2021_2025.ts

# Example for KCET Biology:
cp scripts/oracle/kcet_chemistry_iterative_calibration_2021_2025_v2.ts \
   scripts/oracle/kcet_biology_iterative_calibration_2021_2025.ts
```

### Step 2.2: Customize Calibration Script

Edit the new file and update:

1. **Subject & Exam Constants:**
```typescript
const SUBJECT: Subject = 'Biology';  // Change from 'Chemistry'
const EXAM: ExamContext = 'KCET';
const YEARS = [2021, 2022, 2023, 2024, 2025];
```

2. **Identity Prefix:**
```typescript
const IDENTITY_PREFIX = 'BIO';  // Change from 'CHM'
```

3. **Initial Identity Count:**
```typescript
const INITIAL_IDENTITY_COUNT = 35;  // Estimate based on subject complexity
// Chemistry: 30
// Physics: 35
// Math: 40
// Biology: 35-40
```

4. **Output Paths:**
```typescript
const IDENTITY_BANK_PATH = path.join(
  __dirname,
  '../../lib/oracle/identities/kcet_biology.json'
);

const REPORT_PATH = path.join(
  __dirname,
  '../../docs/oracle/calibration/KCET_BIOLOGY_CALIBRATION_REPORT_2021_2025.md'
);
```

5. **Topic-Specific Logic (Optional):**
```typescript
// Example: Biology-specific identity generation
function generateInitialIdentities(topicDistribution: any): Identity[] {
  // Custom logic for Biology topics
  // E.g., more identities for Physiology, fewer for Ecology
}
```

### Step 2.3: Run Calibration

```bash
# Execute calibration (takes 30-60 minutes)
npx tsx scripts/oracle/${EXAM_LOWER}_${SUBJECT_LOWER}_iterative_calibration_2021_2025.ts \
  2>&1 | tee /tmp/calibration_${SUBJECT_LOWER}.log

# Monitor progress
tail -f /tmp/calibration_${SUBJECT_LOWER}.log
```

**Expected Output:**
```
🔬 Starting KCET Biology Calibration (2021-2025)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Year 2021 (60 questions)
  Iteration 1: Match Rate 35.0%, IDS 0.65 → 0.71
  Iteration 2: Match Rate 42.0%, IDS 0.71 → 0.68
  Iteration 3: Match Rate 55.0%, IDS 0.68 → 0.70
  ✅ Converged at 55.0%

...

✅ Calibration Complete!
   Average Match Rate: 58.2%
   Identity Bank: lib/oracle/identities/kcet_biology.json
   Report: docs/oracle/calibration/KCET_BIOLOGY_CALIBRATION_REPORT_2021_2025.md
```

### Step 2.4: Verify Identity Bank

```bash
# Check generated identity bank
cat lib/oracle/identities/kcet_biology.json | jq '.identities | length'
# Should output: 35 (or your INITIAL_IDENTITY_COUNT)

# Check identity structure
cat lib/oracle/identities/kcet_biology.json | jq '.identities[0]'
```

**Expected Structure:**
```json
{
  "id": "BIO-001",
  "name": "Cell Structure Organelle",
  "topic": "Cell Biology",
  "logic": "Mitochondria and chloroplast structure. Forensic Marker: Double membrane and cristae patterns...",
  "high_yield": true,
  "confidence": 0.85
}
```

### Step 2.5: Review Calibration Report

```bash
# Open report
cat docs/oracle/calibration/KCET_BIOLOGY_CALIBRATION_REPORT_2021_2025.md
```

**Check Key Metrics:**
- Average Match Rate: >50% (good), >60% (excellent)
- Identity Hit Rate: >55%
- Difficulty Accuracy: >70%
- IDS Range: 0.60-0.80 (typical)

---

## Phase 3: Question Type Analysis

**Time:** 1 hour
**Output:** Question type distribution JSON

### Step 3.1: Create Analysis Script

```bash
# Copy template
cp scripts/oracle/analyze_chemistry_question_types_2021_2025.ts \
   scripts/oracle/analyze_${SUBJECT_LOWER}_question_types_2021_2025.ts
```

### Step 3.2: Customize Analysis Script

Edit the new file:

1. **Subject & Exam:**
```typescript
const SUBJECT = 'Biology';
const EXAM = 'KCET';
```

2. **Question Type Categories (Subject-Specific):**
```typescript
// For Biology:
const QUESTION_TYPES = [
  'theory_conceptual',      // Definitions, concepts, processes
  'diagram_based',          // Label diagrams, identify structures
  'application',            // Real-world scenarios
  'experimental',           // Lab procedures, observations
  'calculation',            // Numerical (genetics, ecology)
  'taxonomy',              // Classification questions
  'comparison'             // Compare organisms/processes
];

// For Physics:
const QUESTION_TYPES = [
  'conceptual',            // Theory and concepts
  'numerical',             // Calculations
  'derivation',            // Proof-based
  'graphical',             // Graph interpretation
  'application'            // Real-world physics
];

// For Math:
const QUESTION_TYPES = [
  'procedural',            // Step-by-step calculations
  'conceptual',            // Understanding concepts
  'proof',                 // Proofs and derivations
  'application',           // Word problems
  'graphical'              // Graph/geometry problems
];
```

3. **Classification Keywords:**
```typescript
const CLASSIFIERS = {
  theory_conceptual: ['define', 'explain', 'describe', 'what is', 'theory'],
  diagram_based: ['diagram', 'label', 'identify structure', 'figure shows'],
  application: ['real-world', 'application', 'used in', 'example'],
  experimental: ['experiment', 'observation', 'procedure', 'lab'],
  calculation: ['calculate', 'how many', 'find the', 'determine'],
  taxonomy: ['classify', 'kingdom', 'phylum', 'order', 'species'],
  comparison: ['compare', 'difference', 'distinguish', 'contrast']
};
```

### Step 3.3: Run Analysis

```bash
# Execute analysis
npx tsx scripts/oracle/analyze_${SUBJECT_LOWER}_question_types_2021_2025.ts

# Output file created:
# docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_${SUBJECT_UPPER}.json
```

**Expected Output:**
```json
{
  "subject": "Biology",
  "exam": "KCET",
  "years_analyzed": "2021-2025",
  "total_questions": 300,
  "questionTypeProfile": {
    "theory_conceptual": 30,
    "diagram_based": 25,
    "application": 20,
    "experimental": 10,
    "calculation": 8,
    "taxonomy": 5,
    "comparison": 2
  }
}
```

### Step 3.4: Validate Distribution

```bash
# Check percentages sum to 100
cat docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_BIOLOGY.json | \
  jq '.questionTypeProfile | add'
# Should output: 100
```

---

## Phase 4: Database Configuration

**Time:** 15 minutes
**Output:** REI parameters in database

### Step 4.1: Calculate REI Parameters

From calibration report, extract:
- `rigor_drift_multiplier` → `rigor_velocity`
- Average IDS → `ids_target`
- `synthesis_weight`, `trap_weight`, etc. → `intent_signature`
- Difficulty percentages → `difficulty_*_pct`

### Step 4.2: Insert Calibration Record

```sql
-- Insert into ai_universal_calibration table
INSERT INTO ai_universal_calibration (
  id,
  exam_type,
  subject,
  target_year,
  rigor_velocity,
  ids_target,
  board_signature,
  intent_signature,
  calibration_directives,
  difficulty_easy_pct,
  difficulty_moderate_pct,
  difficulty_hard_pct,
  created_at
) VALUES (
  gen_random_uuid(),
  'KCET',                    -- Your exam
  'Biology',                 -- Your subject
  2026,
  1.45,                      -- From calibration: rigor_drift_multiplier
  0.68,                      -- From calibration: average IDS
  'CONCEPTUAL',              -- Board signature (subject-specific)
  jsonb_build_object(
    'synthesis', 0.30,       -- From calibration: synthesis_weight
    'trapDensity', 0.25,     -- From calibration: trap_weight
    'linguisticLoad', 0.20,  -- From calibration: intent_learning_rate
    'speedRequirement', 0.90,
    'questionTypeProfile', jsonb_build_object(
      'theory_conceptual', 30,
      'diagram_based', 25,
      'application', 20,
      'experimental', 10,
      'calculation', 8,
      'taxonomy', 5,
      'comparison', 2
    )
  ),
  ARRAY[
    'Focus on NCERT diagrams and lifecycle questions',
    'Include taxonomy and classification',
    'Application-based scenarios from physiology',
    'Target IDS: 0.68 (Range: 0.60-0.75)',
    'Focus on high-confidence identities: BIO-001, BIO-015, BIO-023'
  ],
  55,                        -- From calibration: easy %
  40,                        -- From calibration: moderate %
  5,                         -- From calibration: hard %
  NOW()
);
```

### Step 4.3: Verify Database Entry

```sql
-- Verify insertion
SELECT
  exam_type,
  subject,
  target_year,
  rigor_velocity,
  ids_target,
  board_signature,
  intent_signature->>'synthesis' as synthesis,
  intent_signature->'questionTypeProfile'->>'theory_conceptual' as theory_pct
FROM ai_universal_calibration
WHERE exam_type = 'KCET'
  AND subject = 'Biology'
  AND target_year = 2026;
```

**Expected Output:**
```
exam_type | subject | target_year | rigor_velocity | ids_target | board_signature | synthesis | theory_pct
----------|---------|-------------|----------------|------------|-----------------|-----------|------------
KCET      | Biology | 2026        | 1.45           | 0.68       | CONCEPTUAL      | 0.30      | 30
```

---

## Phase 5: Generator Setup

**Time:** 30 minutes
**Output:** Flagship generator script

### Step 5.1: Create Generator Script

```bash
# Copy template
cp scripts/oracle/generate_flagship_chemistry.ts \
   scripts/oracle/generate_flagship_${SUBJECT_LOWER}.ts
```

### Step 5.2: Customize Generator

Edit the new file:

1. **Subject & Exam:**
```typescript
const subject = "Biology";
const exam = "KCET";
```

2. **Load Question Type Profile:**
```typescript
const questionTypeAnalysisPath = path.join(
  __dirname,
  '../../docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_BIOLOGY.json'
);
```

3. **Calculate Question Counts:**
```typescript
const questionTypeCounts = {
  theory_conceptual: Math.round(60 * questionTypeProfile.theory_conceptual / 100),  // 18
  diagram_based: Math.round(60 * questionTypeProfile.diagram_based / 100),          // 15
  application: Math.round(60 * questionTypeProfile.application / 100),              // 12
  experimental: Math.round(60 * questionTypeProfile.experimental / 100),            // 6
  calculation: Math.round(60 * questionTypeProfile.calculation / 100),              // 5
  taxonomy: Math.round(60 * questionTypeProfile.taxonomy / 100),                    // 3
  comparison: Math.round(60 * questionTypeProfile.comparison / 100)                 // 1
};
```

4. **High-Yield Identities:**
```typescript
const highYieldIdentities = sortedIdentities.slice(0, 10).map((i: any) => i.id);
// e.g., ['BIO-001', 'BIO-015', 'BIO-023', ...]
```

5. **Subject-Specific Directives:**
```typescript
directives: [
  "🎯 CRITICAL: ENFORCE EXACT QUESTION TYPE DISTRIBUTION:",
  `GENERATE EXACTLY ${questionTypeCounts.theory_conceptual} THEORY_CONCEPTUAL questions (definitions, concepts, processes)`,
  `GENERATE EXACTLY ${questionTypeCounts.diagram_based} DIAGRAM_BASED questions (label diagrams, identify structures)`,
  `GENERATE EXACTLY ${questionTypeCounts.application} APPLICATION questions (real-world scenarios)`,
  `GENERATE EXACTLY ${questionTypeCounts.experimental} EXPERIMENTAL questions (lab procedures, observations)`,
  `GENERATE EXACTLY ${questionTypeCounts.calculation} CALCULATION questions (genetics, ecology calculations)`,
  `GENERATE EXACTLY ${questionTypeCounts.taxonomy} TAXONOMY questions (classification)`,
  `GENERATE EXACTLY ${questionTypeCounts.comparison} COMPARISON questions (compare organisms/processes)`,
  "",
  "Target IDS: 0.68 (Range: 0.60-0.75)",
  "Focus on NCERT diagrams and lifecycle questions",
  "Include taxonomy and classification",
  "Application-based scenarios from physiology"
]
```

### Step 5.3: Test Generator

```bash
# Run generator
npx tsx scripts/oracle/generate_flagship_${SUBJECT_LOWER}.ts \
  2>&1 | tee /tmp/${SUBJECT_LOWER}_flagship_generation.log

# Monitor progress
tail -f /tmp/${SUBJECT_LOWER}_flagship_generation.log
```

**Expected Output:**
```
🧪 GENERATING KCET BIOLOGY 2026 FLAGSHIP - REI v17
═══════════════════════════════════════════════════════

📊 Loading calibration forecast...
🧬 Loading Biology identity bank...
   ✅ Found 35 Biology identities
   🎯 High-yield identities (≥70%): BIO-001, BIO-015, BIO-023...

📡 GENERATING SET A (60 questions)...
✅ Generated 60 fresh AI questions
🧬 Identity mapping: 45/60 questions assigned

📡 GENERATING SET B (60 questions)...
✅ Generated 60 fresh AI questions
🧬 Identity mapping: 47/60 questions assigned

✅ BIOLOGY FLAGSHIP GENERATION COMPLETE!
```

---

## Phase 6: Flagship Generation

**Time:** 30-45 minutes
**Output:** 120 AI-generated questions (SET A + SET B) in database

### Step 6.1: Run Flagship Generator

```bash
# Execute generator
npx tsx scripts/oracle/generate_flagship_${SUBJECT_LOWER}.ts \
  2>&1 | tee /tmp/${SUBJECT_LOWER}_flagship_generation.log

# Monitor progress
tail -f /tmp/${SUBJECT_LOWER}_flagship_generation.log
```

**Expected Output:**
```
🧪 GENERATING KCET BIOLOGY 2026 FLAGSHIP - REI v17
═══════════════════════════════════════════════════════

📊 Loading calibration forecast...
🧬 Loading Biology identity bank...
   ✅ Found 35 Biology identities
   🎯 High-yield identities (≥70%): BIO-001, BIO-015, BIO-023...

📡 GENERATING SET A (60 questions)...
✅ Generated 60 fresh AI questions
🧬 Identity mapping: 45/60 questions assigned

📡 GENERATING SET B (60 questions)...
✅ Generated 60 fresh AI questions
🧬 Identity mapping: 47/60 questions assigned

✅ BIOLOGY FLAGSHIP GENERATION COMPLETE!
   Total Questions: 120
   Database Scan ID: ea306fe3-85ac-4bfa-a9e1-012d99f3c2f9
```

### Step 6.2: Verify Generation Completed

```bash
# Check database for new questions
psql -d your_db -c "
  SELECT COUNT(*) as total_questions
  FROM questions
  WHERE subject = '${SUBJECT}'
    AND exam_context = '${EXAM}'
    AND source = 'AI'
    AND created_at > NOW() - INTERVAL '1 hour';
"
```

**Expected Output:**
```
total_questions
----------------
120
```

### Step 6.3: Record Scan ID

From the generator output, record the scan_id (UUID). This will be used for:
- Verification scripts
- UI export scripts
- Cleanup scripts

**Example:**
```bash
# Save to variable for later use
SCAN_ID="ea306fe3-85ac-4bfa-a9e1-012d99f3c2f9"
```

---

## Phase 7: Quality Verification

**Time:** 15-20 minutes
**Output:** Verification report confirming quality metrics

### Step 7.1: Create Verification Script

```bash
# Copy template
cp scripts/temp-verify-chemistry-flagship-v2.ts \
   scripts/temp-verify-${SUBJECT_LOWER}-flagship-v2.ts
```

Edit and update subject/exam references.

### Step 7.2: Run Verification

```bash
# Verify generated questions
npx tsx scripts/temp-verify-${SUBJECT_LOWER}-flagship-v2.ts

# Save results
npx tsx scripts/temp-verify-${SUBJECT_LOWER}-flagship-v2.ts > \
  docs/oracle/verification/${SUBJECT_UPPER}_FLAGSHIP_VERIFICATION.txt
```

**Expected Output:**
```
🔍 VERIFYING BIOLOGY FLAGSHIP v2 GENERATION
═══════════════════════════════════════════════════════

✅ Found 120 recent Biology KCET AI-generated questions

📊 SET_A: KCET Biology 2026 Flagship
   Total Questions: 60/60

   🎯 DIFFICULTY DISTRIBUTION:
      Easy: 33 (55%) → Target: 33 (55%) ✅ MATCH
      Moderate: 24 (40%) → Target: 24 (40%) ✅ MATCH
      Hard: 3 (5%) → Target: 3 (5%) ✅ MATCH
      Status: ✅ MATCH

   📋 QUESTION TYPE DISTRIBUTION:
      theory_conceptual: 17/18 (-1) ✅
      diagram_based: 14/15 (-1) ✅
      application: 13/12 (+1) ✅
      experimental: 6/6 (+0) ✅ PERFECT
      calculation: 6/5 (+1) ✅
      taxonomy: 3/3 (+0) ✅ PERFECT
      comparison: 1/1 (+0) ✅ PERFECT
      untagged: 0 ✅

      Overall Type Accuracy: 88.3%
      Perfect Matches: 3/7 types

   🧬 IDENTITY ASSIGNMENT:
      Assigned: 45/60 (75%)
      Status: ✅ GOOD

   VERDICT: ✅ PASS
```

### Step 7.3: Quality Checks

```bash
# Check for null metadata
psql -d your_db -c "
  SELECT COUNT(*) as null_metadata_count
  FROM questions
  WHERE subject = 'Biology'
    AND exam_context = 'KCET'
    AND created_at > NOW() - INTERVAL '1 hour'
    AND (
      metadata->>'questionType' IS NULL
      OR metadata = '{}'::jsonb
    );
"
# Should output: 0

# Check type distribution
psql -d your_db -c "
  SELECT
    metadata->>'questionType' as question_type,
    COUNT(*) as count
  FROM questions
  WHERE subject = 'Biology'
    AND exam_context = 'KCET'
    AND created_at > NOW() - INTERVAL '1 hour'
  GROUP BY metadata->>'questionType'
  ORDER BY count DESC;
"
```

**Expected Output:**
```
question_type     | count
------------------|-------
theory_conceptual | 35
diagram_based     | 29
application       | 25
experimental      | 12
calculation       | 11
taxonomy          | 6
comparison        | 2
```

---

## Phase 8: UI Deployment

**Time:** 10-15 minutes
**Output:** JSON files ready for UI consumption

### Step 8.1: Create Export Script

```bash
# Create export script from template
cat > scripts/oracle/export_${SUBJECT_LOWER}_flagship_latest.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCAN_ID = 'YOUR_SCAN_ID_HERE';  // ← UPDATE THIS

async function exportFlagship() {
  console.log('🎯 EXPORTING LATEST 120 QUESTIONS TO JSON FILES\n');

  // Get latest 120 questions ordered by creation date
  const { data: allQuestions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'SUBJECT_HERE')  // ← UPDATE THIS
    .order('created_at', { ascending: false })
    .limit(120);

  if (error || !allQuestions) {
    console.error('❌ Error fetching questions:', error);
    return;
  }

  console.log(`✅ Fetched ${allQuestions.length} questions\n`);

  // Split into SET B (newer 60) and SET A (older 60)
  const setB = allQuestions.slice(0, 60);
  const setA = allQuestions.slice(60, 120);

  // Format questions for JSON
  const formatQuestion = (q: any) => ({
    id: q.id,
    text: q.text,
    options: q.options,
    marks: 1,
    difficulty: q.difficulty,
    topic: q.topic,
    subject: q.subject,
    examContext: q.exam_context || 'KCET',
    blooms: q.blooms_level || 'Understand',
    solutionSteps: q.solution_steps || [],
    examTip: q.exam_tip || '',
    studyTip: q.study_tip || '',
    masteryMaterial: q.mastery_material || {},
    keyFormulas: q.key_formulas || [],
    thingsToRemember: q.things_to_remember || [],
    questionVariations: q.question_variations || [],
    correct_option_index: q.correct_option_index,
    metadata: q.metadata
  });

  // Create SET A JSON
  const setAJson = {
    test_name: 'PLUS2AI OFFICIAL SUBJECT PREDICTION 2026: SET_A',  // ← UPDATE
    subject: 'SUBJECT',  // ← UPDATE
    exam_context: 'KCET',
    total_questions: 60,
    test_config: {
      questions: setA.map(formatQuestion)
    }
  };

  // Create SET B JSON
  const setBJson = {
    test_name: 'PLUS2AI OFFICIAL SUBJECT PREDICTION 2026: SET_B',  // ← UPDATE
    subject: 'SUBJECT',  // ← UPDATE
    exam_context: 'KCET',
    total_questions: 60,
    test_config: {
      questions: setB.map(formatQuestion)
    }
  };

  // Write to root directory
  const rootDir = process.cwd();
  const setAPath = path.join(rootDir, 'flagship_subject_final.json');     // ← UPDATE
  const setBPath = path.join(rootDir, 'flagship_subject_final_b.json');   // ← UPDATE

  fs.writeFileSync(setAPath, JSON.stringify(setAJson, null, 2));
  fs.writeFileSync(setBPath, JSON.stringify(setBJson, null, 2));

  console.log(`✅ SET A exported to: flagship_subject_final.json`);
  console.log(`✅ SET B exported to: flagship_subject_final_b.json\n`);
}

exportFlagship().catch(console.error);
EOF
```

### Step 8.2: Customize Export Script

Update the placeholders in the script:

1. **SCAN_ID:** Replace with your scan_id from Phase 6
2. **Subject Name:** Replace 'SUBJECT_HERE' with your subject
3. **File Names:** Update 'subject' to match your subject (e.g., 'biology', 'chemistry')

**Example for Biology:**
```typescript
const SCAN_ID = 'ea306fe3-85ac-4bfa-a9e1-012d99f3c2f9';
// ...
.eq('subject', 'Biology')
// ...
test_name: 'PLUS2AI OFFICIAL BIOLOGY PREDICTION 2026: SET_A',
subject: 'Biology',
// ...
const setAPath = path.join(rootDir, 'flagship_biology_final.json');
const setBPath = path.join(rootDir, 'flagship_biology_final_b.json');
```

### Step 8.3: Run Export

```bash
# Execute export script
npx tsx scripts/oracle/export_${SUBJECT_LOWER}_flagship_latest.ts
```

**Expected Output:**
```
🎯 EXPORTING LATEST 120 QUESTIONS TO JSON FILES

✅ Fetched 120 questions from database

📊 Distribution:
   SET A (older 60): Created 4/18/2026, 8:23:36 AM
   SET B (newer 60): Created 4/18/2026, 8:24:05 AM

SET A Difficulty:
   Easy: 54 (90%)
   Moderate: 6 (10%)
   Hard: 0 (0%)

SET B Difficulty:
   Easy: 54 (90%)
   Moderate: 6 (10%)
   Hard: 0 (0%)

✅ SET A exported to: flagship_biology_final.json
✅ SET B exported to: flagship_biology_final_b.json

📦 File Sizes:
   SET A: 135.96 KB
   SET B: 138.36 KB
```

### Step 8.4: Update UI Imports (If New Subject)

If this is a **new subject** not yet in the UI, update `utils/predictedPapersData.ts`:

```typescript
// Add import at top
import biologySetA from '../flagship_biology_final.json';
import biologySetB from '../flagship_biology_final_b.json';

// Add to papers array in getPredictedPapers()
{
  id: 'biology-a',
  title: 'PLUS2AI OFFICIAL BIOLOGY PREDICTION 2026',
  subject: 'Biology',
  setName: 'A',
  questions: (biologySetA as any).test_config?.questions || (biologySetA as any).questions || []
},
{
  id: 'biology-b',
  title: 'PLUS2AI OFFICIAL BIOLOGY PREDICTION 2026',
  subject: 'Biology',
  setName: 'B',
  questions: (biologySetB as any).test_config?.questions || (biologySetB as any).questions || []
}
```

**Note:** For existing subjects (Math, Physics, Chemistry, Biology), the imports already exist. Just overwrite the JSON files.

### Step 8.5: Verify JSON Structure

```bash
# Verify JSON is valid
jq empty flagship_${SUBJECT_LOWER}_final.json
jq empty flagship_${SUBJECT_LOWER}_final_b.json

# Check question count
jq '.test_config.questions | length' flagship_${SUBJECT_LOWER}_final.json
# Should output: 60

# Check difficulty distribution
grep -o '"difficulty": "[^"]*"' flagship_${SUBJECT_LOWER}_final.json | sort | uniq -c
```

**Expected Output:**
```
  54 "difficulty": "Easy"
   6 "difficulty": "Moderate"
   0 "difficulty": "Hard"
```

### Step 8.6: Test UI Loading (Local)

```bash
# Start dev server
npm run dev

# Open browser to http://localhost:3000
# Navigate to Mock Tests → Biology Set-A Prediction
# Verify questions load correctly
```

**Manual Checks:**
- ✅ Test card appears for the subject
- ✅ 60 questions displayed
- ✅ Questions render with proper formatting
- ✅ Difficulty tags match expected distribution
- ✅ No old questions appear (verify by checking question IDs in console)

---

## Phase 9: Cleanup & Finalization

**Time:** 10-15 minutes
**Output:** Clean database, production-ready deployment

### Step 9.1: (Optional) Remove Old AI-Generated Questions

If you had previous generation attempts, clean them up:

```bash
# Create cleanup script
cat > scripts/oracle/cleanup_old_${SUBJECT_LOWER}_questions.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCAN_ID = 'YOUR_LATEST_SCAN_ID';
const CUTOFF_DATE = 'YYYY-MM-DD HH:MM:SS';  // Before latest generation

async function cleanupOldQuestions() {
  console.log('🧹 CLEANING UP OLD QUESTIONS\n');

  // Get all questions for this subject
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, created_at')
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'SUBJECT')
    .order('created_at', { ascending: false });

  if (!allQuestions) {
    console.log('❌ No questions found');
    return;
  }

  // Keep latest 120, delete older ones
  const toKeep = allQuestions.slice(0, 120);
  const toDelete = allQuestions.slice(120);

  console.log(`📊 Total questions: ${allQuestions.length}`);
  console.log(`✅ Keeping latest 120`);
  console.log(`🗑️  Deleting ${toDelete.length} older questions\n`);

  if (toDelete.length > 0) {
    const deleteIds = toDelete.map(q => q.id);

    const { error } = await supabase
      .from('questions')
      .delete()
      .in('id', deleteIds);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`✅ Deleted ${toDelete.length} questions\n`);
  }

  // Verify
  const { count } = await supabase
    .from('questions')
    .select('id', { count: 'exact' })
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'SUBJECT');

  console.log(`✅ Final count: ${count} questions\n`);
}

cleanupOldQuestions().catch(console.error);
EOF
```

**WARNING:** This deletes old AI-generated questions. Make sure you:
- ✅ Have exported the latest questions to JSON
- ✅ Verified the latest questions are correct
- ✅ Are NOT deleting PYQ (Previous Year Questions) data

```bash
# Run cleanup (only if needed)
npx tsx scripts/oracle/cleanup_old_${SUBJECT_LOWER}_questions.ts
```

### Step 9.2: Create Deployment Documentation

```bash
# Create deployment report
cat > docs/oracle/${SUBJECT_UPPER}_UI_DEPLOYMENT_COMPLETE.md << 'EOF'
# ${SUBJECT} SET A & SET B - UI Deployment Complete

**Date:** $(date +%Y-%m-%d)
**Status:** ✅ DEPLOYED
**Scan ID:** `YOUR_SCAN_ID`

## Summary

Successfully deployed ${SUBJECT} KCET 2026 Flagship Papers (SET A & SET B) to the Learning Journey mock test UI.

## Files Updated

- `flagship_${SUBJECT_LOWER}_final.json` - SET A (60 questions)
- `flagship_${SUBJECT_LOWER}_final_b.json` - SET B (60 questions)

## Quality Metrics

**SET A:**
- Questions: 60/60
- Difficulty: XX% Easy, XX% Moderate, XX% Hard
- Question Type Accuracy: XX%
- Identity Assignment: XX%

**SET B:**
- Questions: 60/60
- Difficulty: XX% Easy, XX% Moderate, XX% Hard
- Question Type Accuracy: XX%
- Identity Assignment: XX%

## User Access

Students can now access:
- "${SUBJECT} Set-A Prediction" test (60 questions)
- "${SUBJECT} Set-B Prediction" test (60 questions)

## Verification Steps Completed

- [x] Latest 120 questions exported to JSON
- [x] JSON files valid and formatted correctly
- [x] UI imports updated (if new subject)
- [x] Local testing passed
- [x] Question distribution verified
- [x] Old questions cleaned up (if applicable)

## Next Steps

- [ ] Monitor student usage and feedback
- [ ] Track performance metrics
- [ ] Iterate based on results (annual recalibration)

---

**Deployed By:** [Your Name]
**Calibration Version:** REI v17.0
**Export Script:** `scripts/oracle/export_${SUBJECT_LOWER}_flagship_latest.ts`
EOF
```

### Step 9.3: Git Commit

```bash
# Stage all changes
git add \
  lib/oracle/identities/kcet_${SUBJECT_LOWER}.json \
  docs/oracle/calibration/KCET_${SUBJECT_UPPER}_CALIBRATION_REPORT_2021_2025.md \
  docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_${SUBJECT_UPPER}.json \
  scripts/oracle/*_${SUBJECT_LOWER}_*.ts \
  flagship_${SUBJECT_LOWER}_final.json \
  flagship_${SUBJECT_LOWER}_final_b.json \
  docs/oracle/${SUBJECT_UPPER}_UI_DEPLOYMENT_COMPLETE.md

# Commit with descriptive message
git commit -m "feat(oracle): REI v17 ${SUBJECT} flagship papers with XX% accuracy

- Generated 120 ${SUBJECT} questions (SET A + SET B)
- Calibrated against 2021-2025 historical data
- Identity bank: XX ${SUBJECT} identities
- Question type distribution: XX% accuracy
- Deployed to UI via JSON export
- Difficulty profile: XX% Easy, XX% Moderate, XX% Hard

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to repository
git push origin main
```

### Step 9.4: Production Deployment Checklist

Before deploying to production:

- [ ] All verification tests pass
- [ ] JSON files are valid and complete
- [ ] Git committed and pushed
- [ ] Local UI testing successful
- [ ] Documentation complete
- [ ] Stakeholders notified
- [ ] Backup of previous version taken
- [ ] Rollback plan ready

### Step 9.5: Post-Deployment Monitoring

**First 24 Hours:**
- Monitor error logs for JSON parsing issues
- Check student engagement metrics
- Collect initial feedback
- Verify no questions missing or malformed

**First Week:**
- Track completion rates
- Analyze difficulty perception vs actual difficulty
- Monitor question type distribution in practice
- Gather student feedback on quality

**First Month:**
- Compare performance to PYQ papers
- Identify high-performing identities
- Collect data for next calibration cycle
- Document lessons learned

---

## Troubleshooting

### Issue: Low Match Rate (<40%)

**Symptoms:**
- Calibration report shows <40% match rate
- Many identities have low confidence (<0.5)

**Solutions:**
1. Increase identity count: `INITIAL_IDENTITY_COUNT = 40`
2. Check historical data quality (topics, difficulty)
3. Run more iterations: `MAX_ITERATIONS = 15`
4. Review topic mapping accuracy

### Issue: Identity Mapping Fails

**Symptoms:**
```
🧬 Identity mapping: 0/60 questions assigned
⚠️  Identity mapping failed: Cannot find module
```

**Solutions:**
1. Verify identity bank exists: `ls lib/oracle/identities/kcet_${SUBJECT_LOWER}.json`
2. Check file permissions
3. Verify JSON syntax: `cat lib/oracle/identities/kcet_${SUBJECT_LOWER}.json | jq .`
4. Restart node process

### Issue: Question Type Accuracy <60%

**Symptoms:**
- Generated questions don't match target distribution
- Many questions classified differently than expected

**Solutions:**
1. **Improve Directives:**
```typescript
// Add more explicit examples
directives: [
  "THEORY_CONCEPTUAL Example: 'What is the function of mitochondria?'",
  "DIAGRAM_BASED Example: 'Label the parts of the heart shown in the diagram'",
  ...
]
```

2. **Add Post-Generation Classifier:**
```typescript
// Reclassify questions after generation
questions.forEach(q => {
  if (q.text.includes('label') || q.text.includes('diagram')) {
    q.questionType = 'diagram_based';
  }
});
```

3. **Regenerate Batches:**
```typescript
// Validate each batch before moving to next
if (batchTypeAccuracy < 0.8) {
  regenerateBatch();
}
```

### Issue: Database Connection Errors

**Symptoms:**
```
❌ Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
1. Check `.env.local` has `DATABASE_URL`
2. Verify database is running: `pg_isready`
3. Test connection: `psql $DATABASE_URL -c "SELECT 1"`
4. Check Supabase URL and keys

### Issue: AI Generation Timeout

**Symptoms:**
```
⚠️  Strategy 1 AI (full context) failed: Timeout after 120s
```

**Solutions:**
1. Reduce batch size: Change `BATCH_SIZE = 4` (from 6)
2. Increase timeout: `timeout: 300000` (5 minutes)
3. Check API key quota
4. Use background generation: `run_in_background: true`

---

## Quality Checklist

### Phase 1-5: Calibration & Setup
- [ ] Calibration report generated with >50% avg match rate
- [ ] Identity bank has 30-40 identities with confidence >0.5
- [ ] Question type analysis shows realistic distribution
- [ ] Database record exists in `ai_universal_calibration`
- [ ] Flagship generator script created and customized

### Phase 6-7: Generation & Verification
- [ ] Flagship generator runs without errors
- [ ] 120/120 questions generated in database
- [ ] Verification shows:
  - [ ] 100% questionType tagged (0 nulls)
  - [ ] >70% identityId assigned
  - [ ] >70% type accuracy
  - [ ] Difficulty matches target ±5%
- [ ] Documentation created:
  - [ ] Calibration report (`.md`)
  - [ ] Question type analysis (`.json`)
  - [ ] Identity bank (`.json`)
  - [ ] Verification report (`.txt`)

### Phase 8-9: UI Deployment & Finalization
- [ ] Export script created and customized
- [ ] JSON files generated (SET A + SET B)
- [ ] JSON files are valid and complete:
  - [ ] 60 questions in SET A
  - [ ] 60 questions in SET B
  - [ ] Correct difficulty distribution
  - [ ] All required fields present
- [ ] UI imports updated (if new subject)
- [ ] Local UI testing passed:
  - [ ] Test cards appear
  - [ ] Questions load correctly
  - [ ] Formatting renders properly
  - [ ] No old questions appear
- [ ] Old questions cleaned up (if applicable)
- [ ] Deployment documentation created
- [ ] Git committed and pushed

### Post-Deployment
- [ ] Production deployment successful
- [ ] Monitor student performance on generated papers
- [ ] Collect feedback on question quality
- [ ] Track type accuracy over time
- [ ] Iterate if needed (recalibrate annually)

---

## Summary

This workflow provides a **complete, repeatable process** for calibrating any new subject/exam combination using the REI v17 system and deploying it to production. The end-to-end process takes 6-8 hours but produces production-ready flagship papers with:

✅ Full REI v17 calibration
✅ Identity-based question matching
✅ Question type distribution enforcement
✅ Metadata persistence
✅ Comprehensive verification
✅ UI deployment via JSON export
✅ Student-accessible mock tests

**Estimated Timeline:**

| Phase | Task | Time | Output |
|-------|------|------|--------|
| 1 | Data Preparation | 1-2 hours | Clean historical data in database |
| 2 | Calibration Execution | 2-3 hours | Identity bank + Calibration report |
| 3 | Question Type Analysis | 1 hour | Question type distribution JSON |
| 4 | Database Configuration | 15 min | REI parameters in database |
| 5 | Generator Setup | 30 min | Flagship generator script |
| 6 | Flagship Generation | 30-45 min | 120 questions in database (SET A + B) |
| 7 | Quality Verification | 15-20 min | Verification report |
| 8 | UI Deployment | 10-15 min | JSON files for UI |
| 9 | Cleanup & Finalization | 10-15 min | Production-ready deployment |
| **TOTAL** | **End-to-End** | **6-8 hours** | **Student-facing mock tests** |

**What You Get:**

1. **Database Assets:**
   - Identity bank (30-40 identities)
   - 120 AI-generated questions (SET A + SET B)
   - REI v17 calibration parameters
   - Comprehensive metadata

2. **UI Assets:**
   - `flagship_${subject}_final.json` (SET A - 60 questions)
   - `flagship_${subject}_final_b.json` (SET B - 60 questions)
   - Student-accessible prediction tests

3. **Documentation:**
   - Calibration report (.md)
   - Question type analysis (.json)
   - Verification report (.txt)
   - Deployment documentation (.md)

4. **Quality Assurance:**
   - >70% type accuracy
   - >70% identity assignment
   - Difficulty distribution matches target ±5%
   - 100% metadata tagged

**Key Success Factors:**

- Start with clean, high-quality historical data (5 years ideal, 4 years minimum)
- Verify each phase before proceeding to next
- Use verification scripts to catch issues early
- Test UI locally before production deployment
- Document everything for future iterations

**When to Recalibrate:**

- Annually (after new exam results)
- When exam pattern changes significantly
- When match rate drops below 40%
- When student performance data suggests drift

---

**Last Updated:** 2026-04-18
**Version:** REI v17.0
**Status:** Production Ready (Complete End-to-End Workflow)
**Tested On:** KCET Math, Physics, Chemistry, Biology
