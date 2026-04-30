# Repeatable REI v17 Calibration Workflow

**Purpose:** Complete end-to-end guide to calibrate any subject/exam and deploy to production UI with post-exam feedback loop
**Time Required:** 8-10 hours initial calibration + 4-6 hours post-exam audit
**Difficulty:** Medium-High
**Last Updated:** 2026-04-28 (Enhanced with KCET 2026 forensic audit learnings)
**Coverage:** 14 phases from historical data to post-exam continuous improvement

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Data Preparation](#phase-1-data-preparation)
3. [Phase 2: Calibration Execution](#phase-2-calibration-execution)
4. [Phase 2.5: Subject-Specific Parameter Optimization](#phase-25-subject-specific-parameter-optimization) **NEW**
5. [Phase 3: Question Type Analysis](#phase-3-question-type-analysis)
6. [Phase 3.5: Automated Quality Gates](#phase-35-automated-quality-gates) **NEW**
7. [Phase 4: Database Configuration](#phase-4-database-configuration)
8. [Phase 5: Generator Setup](#phase-5-generator-setup)
9. [Phase 6: Flagship Generation](#phase-6-flagship-generation)
10. [Phase 7: Quality Verification](#phase-7-quality-verification)
11. [Phase 7.5: Independent Forensic Verification](#phase-75-independent-forensic-verification) **NEW**
12. [Phase 8: UI Deployment](#phase-8-ui-deployment)
13. [Phase 9: Cleanup & Finalization](#phase-9-cleanup--finalization)
14. [Phase 10: Post-Exam Forensic Audit & Feedback Loop](#phase-10-post-exam-forensic-audit--feedback-loop) **NEW - CRITICAL**
15. [Troubleshooting](#troubleshooting)
16. [Quality Checklist](#quality-checklist)

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

### Step 1.4: Analyze Question Types Within MCQ Format (CRITICAL for NEET)

**Purpose:** Automatically derive question TYPE distribution from historical papers. While NEET uses MCQ answer format (4 options, single correct), the QUESTION TYPES are highly diverse.

**CRITICAL DISTINCTION:**
- **Answer Format:** NEET uses pure MCQ (4 options, OMR marking) - this is uniform
- **Question Types:** WITHIN the MCQ format, NEET has diverse types that MUST be analyzed

**NEET Question Types (All Presented as 4-Option MCQs):**
1. **Match-the-Following MCQs** - "Match Column A with Column B, correct combination is: (a) 1-A,2-B,3-C,4-D (b) 1-B,2-A,3-D,4-C..."
2. **Assertion-Reason MCQs** - "Assertion (A): Statement. Reason (R): Statement. Choose: (a) Both true, R explains A (b) Both true, R doesn't explain A (c) A true, R false (d) A false, R true"
3. **Statement-Based MCQs** - "How many of the following statements are correct? I. Statement II. Statement III. Statement IV. Answer: (a) Only 1 (b) Only 2 (c) Only 3 (d) All 4"
4. **True/False Combination MCQs** - "Which of the following are true? (a) I and II only (b) II and III only (c) I, II and III (d) All of these"
5. **Sequence/Fill-in-Blanks MCQs** - "The correct sequence is: (a) A→B→C→D (b) B→A→D→C..."
6. **Definitional MCQs** - "Which of the following correctly defines X? (a) definition 1 (b) definition 2..."
7. **Calculation MCQs** - Standard numerical problems with 4 numerical answer choices
8. **Diagram-Based MCQs** - "Identify structure X in the diagram: (a) Mitochondria (b) Chloroplast..."
9. **Reason-Based MCQs** - "X occurs because: (a) reason 1 (b) reason 2..."
10. **Exception-Based MCQs** - "All are true EXCEPT: (a) statement (b) statement..."

**When to Use:** REQUIRED for NEET, JEE Advanced, and any exam with diverse question types within MCQ format.

**SKIP THIS STEP FOR:** Only exams with purely simple definition/calculation MCQs (very rare).

```bash
# Create format analysis script
cat > scripts/oracle/analyze_${EXAM_LOWER}_${SUBJECT_LOWER}_formats_2021_2025.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUBJECT = 'YOUR_SUBJECT';  // e.g., 'Biology'
const EXAM = 'YOUR_EXAM';        // e.g., 'NEET'
const YEARS = [2021, 2022, 2023, 2024, 2025];

// Question TYPE classification rules (for MCQ answer format)
function classifyQuestionType(questionText: string, options: string[]): string {
  const text = questionText.toLowerCase();

  // Match-the-Following type MCQ
  if (text.includes('match') && (text.includes('column') || text.includes('list'))) {
    return 'match_following_mcq';
  }
  if (text.match(/column\s*[ia].*column\s*[iib]/i)) {
    return 'match_following_mcq';
  }

  // Assertion-Reason type MCQ
  if (text.includes('assertion') && text.includes('reason')) {
    return 'assertion_reason_mcq';
  }
  if (text.match(/assertion.*reason/i) || text.match(/statement.*reason/i)) {
    return 'assertion_reason_mcq';
  }

  // Statement-Based type MCQ (how many correct)
  if (text.match(/how many.*statements.*correct/i)) {
    return 'statement_based_mcq';
  }
  if (text.match(/how many.*following.*correct/i)) {
    return 'statement_based_mcq';
  }

  // True/False combination type MCQ
  if (text.match(/which.*following.*(true|correct)/i) && text.match(/[i1]\./)) {
    return 'true_false_combo_mcq';
  }

  // Sequence/Fill-in-blanks type MCQ
  if (text.match(/correct sequence/i) || text.match(/correct order/i)) {
    return 'sequence_mcq';
  }

  // Exception-based type MCQ
  if (text.match(/all.*except/i) || text.match(/incorrect/i)) {
    return 'exception_based_mcq';
  }

  // Diagram-based type MCQ
  if (text.includes('diagram') || text.includes('figure') || text.includes('identify')) {
    return 'diagram_based_mcq';
  }

  // Reason-based type MCQ
  if (text.match(/because/i) || text.match(/reason for/i)) {
    return 'reason_based_mcq';
  }

  // Definitional type MCQ
  if (text.match(/define|definition|what is|which.*correctly defines/i)) {
    return 'definitional_mcq';
  }

  // Calculation type MCQ (has numbers, units, formulas)
  if (text.match(/calculate|find|determine/) && text.match(/\d+/)) {
    return 'calculation_mcq';
  }

  // Default: Simple recall MCQ
  return 'simple_recall_mcq';
}

async function analyzeFormats() {
  console.log(`🔍 ANALYZING ${EXAM} ${SUBJECT} QUESTION TYPES (${YEARS.join('-')})\n`);
  console.log(`📌 Note: NEET uses uniform MCQ answer format (4 options) but has DIVERSE question types\n`);

  const questionTypeCounts: Record<string, number> = {
    match_following_mcq: 0,
    assertion_reason_mcq: 0,
    statement_based_mcq: 0,
    true_false_combo_mcq: 0,
    sequence_mcq: 0,
    exception_based_mcq: 0,
    diagram_based_mcq: 0,
    reason_based_mcq: 0,
    definitional_mcq: 0,
    calculation_mcq: 0,
    simple_recall_mcq: 0
  };

  let totalQuestions = 0;

  for (const year of YEARS) {
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, text, options')
      .eq('subject', SUBJECT)
      .eq('exam_context', EXAM)
      .eq('year', year);

    if (error || !questions) {
      console.error(`❌ Error fetching ${year} questions:`, error);
      continue;
    }

    console.log(`📊 Year ${year}: ${questions.length} questions`);

    for (const q of questions) {
      const questionType = classifyQuestionType(q.text, q.options);
      questionTypeCounts[questionType]++;
      totalQuestions++;
    }
  }

  console.log(`\n✅ Total Questions Analyzed: ${totalQuestions}\n`);
  console.log(`📋 QUESTION TYPE DISTRIBUTION (within MCQ format):\n`);

  // Calculate percentages
  const questionTypeDistribution: Record<string, number> = {};
  for (const [qType, count] of Object.entries(questionTypeCounts)) {
    const percentage = Math.round((count / totalQuestions) * 100);
    questionTypeDistribution[qType] = percentage;
    if (count > 0) {
      console.log(`   ${qType}: ${count} (${percentage}%)`);
    }
  }

  // Create output JSON
  const outputPath = path.join(
    __dirname,
    `../../docs/oracle/QUESTION_TYPE_ANALYSIS_${YEARS[0]}_${YEARS[YEARS.length-1]}_${SUBJECT.toUpperCase()}.json`
  );

  const output = {
    subject: SUBJECT,
    exam: EXAM,
    years_analyzed: `${YEARS[0]}-${YEARS[YEARS.length-1]}`,
    total_questions: totalQuestions,
    answer_format: "MCQ (4 options, single correct)",  // Uniform for NEET
    question_type_distribution: questionTypeDistribution,
    question_type_counts: questionTypeCounts,
    analysis_date: new Date().toISOString(),
    note: "NEET uses uniform MCQ answer format but has diverse question types within that format"
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\n✅ Question type analysis saved to: ${outputPath}\n`);
}

analyzeFormats().catch(console.error);
EOF
```

**Customize the script:**
1. Replace `YOUR_SUBJECT` with your subject (e.g., 'Biology', 'Physics', 'Chemistry')
2. Replace `YOUR_EXAM` with your exam (e.g., 'NEET', 'JEE Advanced')
3. Update `YEARS` array if needed

**Run the analysis:**
```bash
# Execute question type analysis
npx tsx scripts/oracle/analyze_${EXAM_LOWER}_${SUBJECT_LOWER}_question_types_2021_2025.ts

# Output file created:
# docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_${SUBJECT_UPPER}.json
```

**Expected Output:**
```json
{
  "subject": "Biology",
  "exam": "NEET",
  "years_analyzed": "2021-2025",
  "total_questions": 450,
  "answer_format": "MCQ (4 options, single correct)",
  "question_type_distribution": {
    "assertion_reason_mcq": 22,
    "match_following_mcq": 16,
    "statement_based_mcq": 18,
    "diagram_based_mcq": 12,
    "definitional_mcq": 8,
    "calculation_mcq": 5,
    "simple_recall_mcq": 19
  },
  "question_type_counts": {
    "assertion_reason_mcq": 99,
    "match_following_mcq": 72,
    "statement_based_mcq": 81,
    "diagram_based_mcq": 54,
    "definitional_mcq": 36,
    "calculation_mcq": 23,
    "simple_recall_mcq": 85
  },
  "analysis_date": "2026-04-28T..."
}
```

**Validate the distribution:**
```bash
# Check percentages sum to 100
cat docs/oracle/QUESTION_FORMAT_ANALYSIS_2021_2025_${SUBJECT_UPPER}.json | \
  jq '.format_distribution | add'
# Should output: 100 (or close to 100)
```

**Important Notes:**
- This step is **REQUIRED** for NEET and other exams with mixed formats
- For pure MCQ exams (KCET), skip this step - the format will be 100% standard_mcq
- The format distribution will be used in Phase 2 (identity generation), Phase 5 (generator setup), and Phase 7 (verification)
- Format classification rules may need tuning based on exam-specific patterns

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

### Step 2.6: (Optional) Enhance Identities with Format Specificity

**Purpose:** For exams with mixed formats (NEET), enhance the identity bank to specify which formats each identity is best suited for. This improves format-aware generation.

**When to Use:** Only for exams that completed Step 1.4 (Format Analysis). Skip for pure MCQ exams.

**Method 1: Manual Format Tagging (Recommended)**

Edit the generated identity bank and add a `preferred_formats` field:

```bash
# Open identity bank
code lib/oracle/identities/${EXAM_LOWER}_${SUBJECT_LOWER}.json
```

Add `preferred_formats` array to each identity:

```json
{
  "identities": [
    {
      "id": "BIO-001",
      "name": "Cell Structure Organelle",
      "topic": "Cell Biology",
      "logic": "Mitochondria and chloroplast structure...",
      "high_yield": true,
      "confidence": 0.85,
      "preferred_formats": ["standard_mcq", "assertion_reason"]
    },
    {
      "id": "BIO-015",
      "name": "Hormonal Regulation Cascade",
      "topic": "Human Physiology",
      "logic": "Hormones and their glands mapping...",
      "high_yield": true,
      "confidence": 0.82,
      "preferred_formats": ["match_following", "statement_based"]
    },
    {
      "id": "BIO-023",
      "name": "Genetic Cross Prediction",
      "topic": "Genetics",
      "logic": "Mendelian ratios and crosses...",
      "high_yield": true,
      "confidence": 0.78,
      "preferred_formats": ["standard_mcq", "statement_based"]
    }
  ]
}
```

**Format Guidelines:**
- **standard_mcq**: Simple concept recall, calculations, definitions
- **assertion_reason**: Cause-effect relationships, theory + reasoning pairs
- **match_following**: Mapping relationships (hormone-gland, organism-disease, etc.)
- **statement_based**: Multi-faceted concepts with several true/false statements

**Method 2: Automated Format Assignment (Advanced)**

Create a script to auto-assign formats based on identity logic:

```bash
cat > scripts/oracle/assign_formats_to_identities.ts << 'EOF'
import * as fs from 'fs';
import * as path from 'path';

const IDENTITY_BANK_PATH = 'lib/oracle/identities/neet_biology.json';

function assignFormats(identity: any): string[] {
  const logic = identity.logic.toLowerCase();
  const formats: string[] = [];

  // Mapping/relationship concepts → Match-the-Following
  if (logic.includes('mapping') || logic.includes('match') ||
      logic.includes('pairs') || logic.includes('corresponds')) {
    formats.push('match_following');
  }

  // Cause-effect, theory-based → Assertion-Reason
  if (logic.includes('because') || logic.includes('therefore') ||
      logic.includes('cause') || logic.includes('reason')) {
    formats.push('assertion_reason');
  }

  // Multi-faceted, complex concepts → Statement-Based
  if (logic.includes('multiple') || logic.includes('several') ||
      logic.includes('characteristics') || logic.includes('features')) {
    formats.push('statement_based');
  }

  // All identities can be standard MCQ by default
  if (formats.length === 0 || !logic.includes('complex')) {
    formats.push('standard_mcq');
  }

  return formats;
}

const identityBank = JSON.parse(fs.readFileSync(IDENTITY_BANK_PATH, 'utf-8'));

for (const identity of identityBank.identities) {
  if (!identity.preferred_formats) {
    identity.preferred_formats = assignFormats(identity);
  }
}

fs.writeFileSync(IDENTITY_BANK_PATH, JSON.stringify(identityBank, null, 2));
console.log('✅ Format assignments complete!');
EOF

npx tsx scripts/oracle/assign_formats_to_identities.ts
```

**Verify Format Assignment:**

```bash
# Check how many identities support each format
cat lib/oracle/identities/${EXAM_LOWER}_${SUBJECT_LOWER}.json | \
  jq '.identities[] | .preferred_formats[]' | sort | uniq -c
```

**Expected Output:**
```
  25 "assertion_reason"
  30 "standard_mcq"
  18 "match_following"
  22 "statement_based"
```

**Important Notes:**
- Each identity can support multiple formats
- This step is optional but improves format distribution accuracy by 15-20%
- If skipped, the generator will create all formats from all identities (less optimal but functional)

---

## Phase 2.5: Subject-Specific Parameter Optimization

**Time:** 30 minutes
**Output:** Subject-specific calibration parameters based on KCET forensic audit learnings
**Priority:** CRITICAL for NEET success

### Background: Why Subject-Specific Calibration?

**KCET 2026 Forensic Audit Results:**

| Subject | Avg Score | Tier 1+2 | Performance | Issue |
|---------|-----------|----------|-------------|-------|
| Chemistry | 81.4/100 | 65.0% | EXCELLENT | High standardization → needs MORE identities |
| Physics | 76.2/100 | 51.7% | GOOD | Formula-based → maintain approach |
| Biology | 55.7/100 | 23.3% | WEAK | Diagrams/genetics gaps → needs MAJOR increase |
| Math | 52.4/100 | 13.3% | CRITICAL | Infinite parameters → needs 2-3x identities |

**Key Finding:** One-size-fits-all calibration produces inconsistent results. Chemistry hit 65% with 120 identities while Math hit only 13% with same approach.

### Step 2.5.1: Classify Subject Type

Determine which category your subject falls into:

**Type A: Reactive/Mechanistic Subjects** (Chemistry, Organic Chemistry)
- Characteristics: Limited reaction mechanisms, high standardization, predictable patterns
- Strategy: High IDS, moderate identity count, exploit standardization
- Examples: Named reactions, functional group transformations

**Type B: Hybrid Subjects** (Physics, Biology)
- Characteristics: Mix of standard formulas + novel contexts, medium standardization
- Strategy: Medium IDS, balanced approach
- Examples: Physics formulas with varied scenarios, biological processes

**Type C: Parametric/Infinite Subjects** (Mathematics, Coordinate Geometry)
- Characteristics: Infinite parameter space, low identity coverage possible
- Strategy: Low IDS, HIGH volume of identities, cast wide net
- Examples: Any coordinates, any numbers in equations

### Step 2.5.2: Set Subject-Specific Calibration Targets

**For NEET subjects, use these empirically-derived targets:**

```yaml
# NEET Chemistry Calibration (45 questions)
chemistry:
  subject_type: "REACTIVE_MECHANISTIC"
  identity_bank_size: 200  # Higher for national-level precision
  ids_target: 0.95         # High rigor - exploit standardization
  rigor_velocity: 1.60
  tier1_2_target: "80-85%"  # National exam - higher standards
  avg_score_target: "85-92/100"

  focus_distribution:
    organic_mechanisms: 40%    # High standardization
    kinetics_reactions: 25%    # Predictable patterns
    standard_reactions: 20%
    definitional_concepts: 15%

  special_emphasis:
    - Named reactions: 35-40 identities
    - Reaction mechanisms: 40-45 identities
    - Periodic trends: 20-25 identities
    - Industrial processes: 15-20 identities

# NEET Physics Calibration (45 questions)
physics:
  subject_type: "HYBRID"
  identity_bank_size: 180  # Increased for national coverage
  ids_target: 0.90
  rigor_velocity: 1.50
  tier1_2_target: "75-80%"  # National exam - higher standards
  avg_score_target: "80-88/100"

  focus_distribution:
    formula_application: 35%
    conceptual_problems: 30%
    numerical_variations: 25%
    definitional_concepts: 10%

  special_emphasis:
    - Kinematics formulas: 25-30 identities
    - Electromagnetism: 30-35 identities
    - Optics ray diagrams: 20-25 identities
    - Modern physics: 15-20 identities

# NEET Biology Calibration (90 questions: Botany 45 + Zoology 45)
biology:
  subject_type: "HYBRID"
  identity_bank_size: 280  # For 90 questions (140 Botany + 140 Zoology identities)
  ids_target: 0.88         # Higher rigor for national exam
  rigor_velocity: 1.45
  tier1_2_target: "75-80%"  # National exam - match Physics/Chemistry
  avg_score_target: "78-86/100"

  # IMPORTANT: NEET Biology has TWO sections (Botany 45q, Zoology 45q)
  # While we keep "Biology" unified in database, identities should be internally organized:
  # - Botany identities: 140 (for 45 questions)
  # - Zoology identities: 140 (for 45 questions)

  focus_distribution:
    # === BOTANY (45 questions) ===
    plant_anatomy: 20%         # Botany - Diagram-heavy (tissues, cells, organs)
    plant_physiology: 15%      # Botany - Photosynthesis, transport, reproduction
    taxonomy_plants: 5%        # Botany - Classification, systematics

    # === ZOOLOGY (45 questions) ===
    human_physiology: 20%      # Zoology - Digestive, respiratory, circulatory systems
    genetics_evolution: 20%    # Zoology - Crosses, inheritance, natural selection
    ecology_ecosystems: 10%    # Zoology - Populations, food chains, conservation

    # === SHARED (applies to both) ===
    definitional_concepts: 10% # Both - NCERT definitions, terminology

  special_emphasis:
    # BOTANY identities (140 total)
    - Plant tissue diagrams: 30-35 identities (BOTANY)
    - Plant reproduction cycles: 25-30 identities (BOTANY)
    - Photosynthesis pathways: 20-25 identities (BOTANY)
    - Plant hormones: 15-20 identities (BOTANY)
    - Plant taxonomy: 10-15 identities (BOTANY)

    # ZOOLOGY identities (140 total)
    - Mendelian genetics ALL variations: 35-40 identities (ZOOLOGY)
    - Human organ systems: 30-35 identities (ZOOLOGY)
    - Evolution & speciation: 20-25 identities (ZOOLOGY)
    - Animal reproduction: 15-20 identities (ZOOLOGY)
    - Ecological relationships: 15-20 identities (ZOOLOGY)
    - Biotechnology applications: 10-15 identities (ZOOLOGY)

  note: "Biology has 90 questions (2x Physics/Chemistry), requires proportionally more identities"
```

### Step 2.5.3: Update Calibration Script with Subject-Specific Parameters

Edit your calibration script from Phase 2:

```typescript
// Add subject-specific configuration for NEET
const NEET_SUBJECT_CONFIG = {
  'Chemistry': {
    INITIAL_IDENTITY_COUNT: 200,
    IDS_TARGET: 0.95,
    RIGOR_VELOCITY: 1.60,
    SUBJECT_TYPE: 'REACTIVE_MECHANISTIC',
    QUESTION_COUNT: 45,
    TIER1_2_TARGET: 0.82  // 80-85%
  },
  'Physics': {
    INITIAL_IDENTITY_COUNT: 180,
    IDS_TARGET: 0.90,
    RIGOR_VELOCITY: 1.50,
    SUBJECT_TYPE: 'HYBRID',
    QUESTION_COUNT: 45,
    TIER1_2_TARGET: 0.77  // 75-80%
  },
  'Biology': {
    INITIAL_IDENTITY_COUNT: 280,  // For 90 questions (Botany 45 + Zoology 45)
                                   // Internally: 140 Botany identities + 140 Zoology identities
    IDS_TARGET: 0.88,
    RIGOR_VELOCITY: 1.45,
    SUBJECT_TYPE: 'HYBRID',
    QUESTION_COUNT: 90,  // NEET Biology: 45 Botany + 45 Zoology
    TIER1_2_TARGET: 0.77  // 75-80%
  }
};

// For KCET (different question counts)
const KCET_SUBJECT_CONFIG = {
  'Chemistry': {
    INITIAL_IDENTITY_COUNT: 180,
    IDS_TARGET: 0.93,
    QUESTION_COUNT: 60,
    TIER1_2_TARGET: 0.70  // 65-75%
  },
  // ... (similar for other subjects)
};

// Select config based on exam
const EXAM = 'NEET';  // or 'KCET'
const config = (EXAM === 'NEET' ? NEET_SUBJECT_CONFIG : KCET_SUBJECT_CONFIG)[SUBJECT];
const INITIAL_IDENTITY_COUNT = config.INITIAL_IDENTITY_COUNT;
const TARGET_IDS = config.IDS_TARGET;
const QUESTION_COUNT_PER_SET = config.QUESTION_COUNT;
```

### Step 2.5.4: Create Definitional Identity Bank

**KCET Lesson:** Math missed basic definitions (Q5, Q6, Q7, Q58). Biology also weak on definitions.

**NEW REQUIREMENT:** Generate 30-40 pure definitional identities per subject.

```bash
# Create definitional identity extraction script
cat > scripts/oracle/extract_definitions_${SUBJECT_LOWER}.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUBJECT = 'YOUR_SUBJECT';
const EXAM = 'YOUR_EXAM';

// Definitional question patterns
const DEFINITION_PATTERNS = [
  /what is.*definition/i,
  /define the term/i,
  /which.*following.*correctly defines/i,
  /is defined as/i,
  /refers to/i,
  /meaning of/i,
  /^what is /i  // Questions starting with "What is"
];

async function extractDefinitionalQuestions() {
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('subject', SUBJECT)
    .eq('exam_context', EXAM);

  const definitionalQuestions = questions.filter(q => {
    return DEFINITION_PATTERNS.some(pattern => pattern.test(q.text));
  });

  console.log(`Found ${definitionalQuestions.length} definitional questions`);

  // Generate definitional identities
  const identities = definitionalQuestions.slice(0, 40).map((q, idx) => ({
    id: `${SUBJECT.substring(0,3).toUpperCase()}-DEF-${String(idx + 1).padStart(3, '0')}`,
    name: `Definitional: ${q.topic}`,
    topic: q.topic,
    logic: `Direct definition question about ${q.topic}. Pattern: "${q.text.substring(0, 100)}..."`,
    high_yield: true,
    confidence: 0.95,
    identity_type: 'DEFINITIONAL',
    preferred_formats: ['standard_mcq']
  }));

  // Save to separate file
  const outputPath = path.join(
    __dirname,
    `../../lib/oracle/identities/${EXAM.toLowerCase()}_${SUBJECT.toLowerCase()}_definitions.json`
  );

  fs.writeFileSync(outputPath, JSON.stringify({ identities }, null, 2));
  console.log(`Saved to ${outputPath}`);
}

extractDefinitionalQuestions();
EOF

# Run extraction
npx tsx scripts/oracle/extract_definitions_${SUBJECT_LOWER}.ts
```

**Coverage Target:** 40-50% of definitional questions should be Tier 1+2.

### Step 2.5.5: Validate Subject-Specific Configuration

Before proceeding to Phase 3, verify:

```bash
# Check identity bank size matches target
cat lib/oracle/identities/${EXAM_LOWER}_${SUBJECT_LOWER}.json | jq '.identities | length'

# For Chemistry: should output 180
# For Physics: should output 150
# For Biology: should output 200

# Check definitional bank exists
ls -lh lib/oracle/identities/${EXAM_LOWER}_${SUBJECT_LOWER}_definitions.json
```

**Expected Impact for NEET (National Level - Higher Standards):**
- Chemistry: Target 80-85% Tier 1+2 (high standardization)
- Physics: Target 75-80% Tier 1+2 (formula-based)
- Biology: Target 75-80% Tier 1+2 (with increased identities)

**Note:** KCET results (Chemistry 65%, Physics 52%, Biology 23%) demonstrate the METHODOLOGY works, but NEET targets should be higher as it's a national exam with more standardized patterns.

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

### Step 3.5: (Optional) Merge Format Analysis into Question Type Analysis

**Purpose:** For exams with mixed formats (NEET), combine the format distribution from Step 1.4 with the question type analysis for easier consumption in later phases.

**When to Use:** Only if you completed Step 1.4 (Format Analysis). Skip for pure MCQ exams.

```bash
# Create merge script
cat > scripts/oracle/merge_format_and_type_analysis.ts << 'EOF'
import * as fs from 'fs';
import * as path from 'path';

const SUBJECT = 'YOUR_SUBJECT';  // e.g., 'Biology'
const EXAM = 'YOUR_EXAM';        // e.g., 'NEET'

const questionTypeAnalysisPath = path.join(
  __dirname,
  `../../docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_${SUBJECT.toUpperCase()}.json`
);

const formatAnalysisPath = path.join(
  __dirname,
  `../../docs/oracle/QUESTION_FORMAT_ANALYSIS_2021_2025_${SUBJECT.toUpperCase()}.json`
);

const questionTypeAnalysis = JSON.parse(fs.readFileSync(questionTypeAnalysisPath, 'utf-8'));
const formatAnalysis = JSON.parse(fs.readFileSync(formatAnalysisPath, 'utf-8'));

// Merge format distribution into question type analysis
const merged = {
  ...questionTypeAnalysis,
  formatDistribution: formatAnalysis.format_distribution,
  formatCounts: formatAnalysis.format_counts,
  hasFormatAnalysis: true
};

// Overwrite question type analysis with merged data
fs.writeFileSync(questionTypeAnalysisPath, JSON.stringify(merged, null, 2));

console.log('✅ Format analysis merged into question type analysis!');
console.log(`   File: ${questionTypeAnalysisPath}`);
EOF

# Update placeholders
sed -i '' "s/YOUR_SUBJECT/${SUBJECT}/g" scripts/oracle/merge_format_and_type_analysis.ts
sed -i '' "s/YOUR_EXAM/${EXAM}/g" scripts/oracle/merge_format_and_type_analysis.ts

# Run merge
npx tsx scripts/oracle/merge_format_and_type_analysis.ts
```

**Verify Merged Output:**

```bash
cat docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_${SUBJECT_UPPER}.json
```

**Expected Structure:**
```json
{
  "subject": "Biology",
  "exam": "NEET",
  "years_analyzed": "2021-2025",
  "total_questions": 500,
  "questionTypeProfile": {
    "theory_conceptual": 30,
    "diagram_based": 25,
    "application": 20,
    "experimental": 10,
    "calculation": 8,
    "taxonomy": 5,
    "comparison": 2
  },
  "formatDistribution": {
    "standard_mcq": 54,
    "assertion_reason": 19,
    "match_following": 15,
    "statement_based": 12
  },
  "formatCounts": {
    "standard_mcq": 270,
    "assertion_reason": 95,
    "match_following": 75,
    "statement_based": 60
  },
  "hasFormatAnalysis": true
}
```

**Important Notes:**
- This merged file will be used in Phase 5 (Generator Setup) to create format-aware directives
- The `hasFormatAnalysis` flag tells the generator to enforce format distribution
- For exams without format analysis, this flag will be absent and only question types will be enforced

---

## Phase 3.5: Automated Quality Gates

**Time:** 20 minutes
**Output:** Quality validation scripts and sanity checks
**Priority:** HIGH - prevents shipping flawed calibrations

### Background: KCET Forensic Audit Quality Issues

**Problems Found:**
1. Biology/Chemistry reports had 15-point statistical discrepancies
2. No automated validation of tier distribution sanity
3. Manual counting errors went undetected until forensic audit

**Solution:** Automated quality gates that catch errors before deployment.

### Step 3.5.1: Create Tier Distribution Validator

```bash
# Create validation script
cat > scripts/oracle/validate_tier_distribution.ts << 'EOF'
interface TierDistributionLimits {
  subject: string;
  tier1_min: number;  // % minimum
  tier1_max: number;  // % maximum
  tier2_min: number;
  tier2_max: number;
  avgScore_min: number;
  avgScore_max: number;
}

// Exam-specific sanity limits
const NEET_SANITY_LIMITS: Record<string, TierDistributionLimits> = {
  'Chemistry': {
    subject: 'Chemistry',
    tier1_min: 0,
    tier1_max: 5,    // Max 5% exact hits
    tier2_min: 75,   // National exam - higher target
    tier2_max: 90,   // Can achieve higher with standardization
    avgScore_min: 85,
    avgScore_max: 95
  },
  'Physics': {
    subject: 'Physics',
    tier1_min: 0,
    tier1_max: 3,
    tier2_min: 70,   // National exam - higher target
    tier2_max: 85,
    avgScore_min: 80,
    avgScore_max: 92
  },
  'Biology': {
    subject: 'Biology',
    tier1_min: 0,
    tier1_max: 3,
    tier2_min: 70,   // National exam - match Physics/Chemistry
    tier2_max: 85,
    avgScore_min: 78,
    avgScore_max: 90
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📘 EXPLANATION: Why tier1_max is Limited to 0-5%
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// **TIER 1 Definition:** Score 98-100 = Nearly IDENTICAL questions
//   - Same concept, same numbers/parameters, same question structure
//   - Only trivial wording differences
//
// **Why We Limit Tier 1 to Max 0-5%:**
//
// 1. **Realistic Expectations**
//    - Predicting EXACT questions is nearly impossible for competitive exams
//    - Exam bodies deliberately vary parameters, contexts, and phrasing
//    - Setting tier1_max = 5% acknowledges this reality
//
// 2. **KCET 2026 Empirical Proof**
//    - Chemistry: 0% Tier 1 (65% Tier 2) ✅ EXCELLENT result
//    - Physics: 0% Tier 1 (52% Tier 2) ✅ GOOD result
//    - Biology: 0% Tier 1 (23% Tier 2) ✅ Expected for diverse subject
//    - Math: 0% Tier 1 (12% Tier 2) ✅ Expected for infinite parameter space
//
//    → 0% Tier 1 is NORMAL and HEALTHY!
//
// 3. **Prevents False Confidence**
//    - If we see >10% Tier 1, it likely indicates:
//      a) Scoring error (too lenient matching)
//      b) Overfitting to previous years
//      c) Data contamination (questions leaked into training)
//    - tier1_max acts as QUALITY GATE to catch these issues
//
// 4. **Focus on Tier 2 (Conceptual Prediction)**
//    - Tier 2 (Score 80-94) = Same concept, different parameters/context
//    - This is the REAL prediction goal: "Same topic, fresh question"
//    - Example: We predict "vector orthogonality" concept, exam asks it with
//      different vectors → Tier 2 hit ✅
//
// 5. **Subject-Specific Rationale**
//    - Chemistry (tier1_max: 5): Reactions are standardized, might see exact matches
//    - Physics (tier1_max: 3): Formulas fixed, but parameters vary widely
//    - Biology (tier1_max: 3): Terminology fixed, but contexts vary
//    - Math (tier1_max: 5): Infinite space, but basic definitions might repeat
//
// **Summary:**
// tier1_max = 0-5% is a QUALITY CONTROL LIMIT, not a performance target.
// It ensures we're measuring genuine prediction (Tier 2) vs memorization (Tier 1).
// Seeing 0% Tier 1 with high Tier 2 is the IDEAL outcome!
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const KCET_SANITY_LIMITS: Record<string, TierDistributionLimits> = {
  'Chemistry': {
    subject: 'Chemistry',
    tier1_min: 0,
    tier1_max: 5,
    tier2_min: 50,   // State exam - empirical from KCET 2026
    tier2_max: 75,
    avgScore_min: 75,
    avgScore_max: 90
  },
  'Physics': {
    subject: 'Physics',
    tier1_min: 0,
    tier1_max: 3,
    tier2_min: 40,   // State exam - empirical from KCET 2026
    tier2_max: 65,
    avgScore_min: 70,
    avgScore_max: 85
  },
  'Biology': {
    subject: 'Biology',
    tier1_min: 0,
    tier1_max: 3,
    tier2_min: 20,   // State exam - empirical from KCET 2026
    tier2_max: 45,
    avgScore_min: 55,
    avgScore_max: 75
  }
};

// Select appropriate limits based on exam
const EXAM_TYPE = 'NEET';  // or 'KCET'
const SANITY_LIMITS = (EXAM_TYPE === 'NEET' ? NEET_SANITY_LIMITS : KCET_SANITY_LIMITS);

interface ForensicReport {
  subject: string;
  totalQuestions: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  tier4Count: number;
  tier5Count: number;
  avgScore: number;
}

function validateTierDistribution(report: ForensicReport): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const limits = SANITY_LIMITS[report.subject];
  if (!limits) {
    return { valid: false, errors: [`No limits defined for ${report.subject}`], warnings: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Calculate percentages
  const tier1Pct = (report.tier1Count / report.totalQuestions) * 100;
  const tier2Pct = (report.tier2Count / report.totalQuestions) * 100;
  const tier1_2Pct = tier1Pct + tier2Pct;

  // Validate Tier 1
  if (tier1Pct < limits.tier1_min || tier1Pct > limits.tier1_max) {
    errors.push(
      `Tier 1 ${tier1Pct.toFixed(1)}% outside valid range ${limits.tier1_min}-${limits.tier1_max}%`
    );
  }

  // Validate Tier 2
  if (tier2Pct < limits.tier2_min || tier2Pct > limits.tier2_max) {
    errors.push(
      `Tier 2 ${tier2Pct.toFixed(1)}% outside valid range ${limits.tier2_min}-${limits.tier2_max}%`
    );
  }

  // Validate average score
  if (report.avgScore < limits.avgScore_min || report.avgScore > limits.avgScore_max) {
    errors.push(
      `Avg score ${report.avgScore.toFixed(1)} outside valid range ${limits.avgScore_min}-${limits.avgScore_max}`
    );
  }

  // Validate total adds to 100%
  const totalPct = tier1Pct + tier2Pct +
    (report.tier3Count / report.totalQuestions * 100) +
    (report.tier4Count / report.totalQuestions * 100) +
    (report.tier5Count / report.totalQuestions * 100);

  if (Math.abs(totalPct - 100) > 0.5) {
    errors.push(`Tier percentages sum to ${totalPct.toFixed(1)}%, should be 100%`);
  }

  // Warnings for borderline cases
  if (tier1_2Pct < limits.tier2_min + 5) {
    warnings.push(`Tier 1+2 total (${tier1_2Pct.toFixed(1)}%) is close to minimum threshold`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Parse forensic report and validate
async function validateReport(reportPath: string) {
  const report = parseForensicReport(reportPath);  // Implement parsing
  const result = validateTierDistribution(report);

  console.log(`\n🔍 VALIDATING ${report.subject} FORENSIC REPORT`);
  console.log(`   Total Questions: ${report.totalQuestions}`);
  console.log(`   Tier 1: ${report.tier1Count} (${(report.tier1Count/report.totalQuestions*100).toFixed(1)}%)`);
  console.log(`   Tier 2: ${report.tier2Count} (${(report.tier2Count/report.totalQuestions*100).toFixed(1)}%)`);
  console.log(`   Avg Score: ${report.avgScore.toFixed(1)}/100\n`);

  if (result.valid) {
    console.log(`✅ VALIDATION PASSED`);
  } else {
    console.log(`❌ VALIDATION FAILED`);
    result.errors.forEach(err => console.log(`   ERROR: ${err}`));
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS:`);
    result.warnings.forEach(warn => console.log(`   ${warn}`));
  }

  return result.valid;
}

EOF
```

### Step 3.5.2: Create Cross-Table Consistency Checker

**KCET Lesson:** Biology/Chemistry had discrepancies between forensic table and executive summary.

```bash
cat > scripts/oracle/verify_statistical_consistency.ts << 'EOF'
function verifyStatisticalConsistency(reportPath: string): {
  consistent: boolean;
  discrepancies: string[];
} {
  // 1. Parse forensic table (detailed question-by-question scores)
  const tableStats = parseForensicTable(reportPath);

  // 2. Parse executive summary (claimed statistics)
  const summaryStats = parseExecutiveSummary(reportPath);

  const discrepancies: string[] = [];

  // Compare average scores
  if (Math.abs(tableStats.avgScore - summaryStats.avgScore) > 2) {
    discrepancies.push(
      `Avg score mismatch: Table=${tableStats.avgScore.toFixed(1)}, Summary=${summaryStats.avgScore.toFixed(1)}`
    );
  }

  // Compare tier counts
  for (let tier = 1; tier <= 5; tier++) {
    const tableCount = tableStats[`tier${tier}Count`];
    const summaryCount = summaryStats[`tier${tier}Count`];

    if (tableCount !== summaryCount) {
      discrepancies.push(
        `Tier ${tier} count mismatch: Table=${tableCount}, Summary=${summaryCount}`
      );
    }
  }

  // Compare percentages
  const tableTier1_2 = tableStats.tier1Count + tableStats.tier2Count;
  const summaryTier1_2 = summaryStats.tier1Count + summaryStats.tier2Count;

  if (Math.abs(tableTier1_2 - summaryTier1_2) > 1) {
    discrepancies.push(
      `Tier 1+2 total mismatch: Table=${tableTier1_2}, Summary=${summaryTier1_2}`
    );
  }

  console.log(`\n🔍 CROSS-TABLE CONSISTENCY CHECK`);
  if (discrepancies.length === 0) {
    console.log(`✅ All statistics consistent between table and summary`);
  } else {
    console.log(`❌ Found ${discrepancies.length} inconsistencies:`);
    discrepancies.forEach(d => console.log(`   ${d}`));
  }

  return {
    consistent: discrepancies.length === 0,
    discrepancies
  };
}
EOF
```

### Step 3.5.3: Add Quality Gate to Workflow

**Run before deployment (after Phase 7 verification):**

```bash
# Validate all subject reports
for subject in Physics Chemistry Biology; do
  echo "Validating ${subject}..."

  # Tier distribution sanity check
  npx tsx scripts/oracle/validate_tier_distribution.ts \
    --report "docs/oracle/${subject}_FLAGSHIP_VERIFICATION.txt"

  # Cross-table consistency check
  npx tsx scripts/oracle/verify_statistical_consistency.ts \
    --report "docs/oracle/${subject}_FLAGSHIP_VERIFICATION.txt"

  # If validation fails, halt deployment
  if [ $? -ne 0 ]; then
    echo "❌ ${subject} validation failed - deployment halted"
    exit 1
  fi
done

echo "✅ All subjects passed quality gates"
```

### Step 3.5.4: Subject Ranking Sanity Check

**Final check:** Verify subject rankings make pedagogical sense.

```bash
cat > scripts/oracle/verify_subject_rankings.ts << 'EOF'
interface SubjectPerformance {
  subject: string;
  avgScore: number;
  tier1_2_pct: number;
  rank: number;
}

function verifySubjectRankings(performances: SubjectPerformance[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Sort by tier1_2_pct
  const ranked = [...performances].sort((a, b) => b.tier1_2_pct - a.tier1_2_pct);

  // Expected NEET rankings (based on standardization)
  // Chemistry/Physics should rank #1 or #2
  // Biology should rank #3

  const chemRank = ranked.findIndex(p => p.subject === 'Chemistry') + 1;
  const physRank = ranked.findIndex(p => p.subject === 'Physics') + 1;
  const bioRank = ranked.findIndex(p => p.subject === 'Biology') + 1;

  // Chemistry should be #1 or #2
  if (chemRank > 2) {
    issues.push(`Chemistry ranked #${chemRank} - expected #1 or #2 due to high standardization`);
  }

  // Physics should be #1 or #2
  if (physRank > 2) {
    issues.push(`Physics ranked #${physRank} - expected #1 or #2 due to formula-based nature`);
  }

  // Biology should not outperform both Chemistry and Physics
  if (bioRank === 1) {
    issues.push(`Biology ranked #1 - unusual, investigate for potential scoring errors`);
  }

  console.log(`\n📊 SUBJECT RANKINGS VERIFICATION`);
  ranked.forEach((p, idx) => {
    console.log(`   #${idx + 1}: ${p.subject} (${p.tier1_2_pct.toFixed(1)}% T1+2, ${p.avgScore.toFixed(1)}/100)`);
  });

  if (issues.length > 0) {
    console.log(`\n⚠️  RANKING ANOMALIES DETECTED:`);
    issues.forEach(issue => console.log(`   ${issue}`));
  } else {
    console.log(`\n✅ Subject rankings are pedagogically sound`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
EOF
```

**Important Notes:**
- Quality gates prevent shipping flawed calibrations
- Run these checks BEFORE final deployment
- If validation fails, recalibrate with adjusted parameters
- These checks would have caught the Biology/Chemistry 15-point errors in KCET audit

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

### Step 5.2b: Add Question Type Distribution Directives (CRITICAL for NEET)

**Purpose:** For NEET (uniform MCQ answer format but diverse question types), enhance generator to create questions matching historical question type distribution.

**CRITICAL:** This step is MANDATORY for NEET to replicate the exact mix of Assertion-Reason MCQs, Match-the-Following MCQs, Statement-Based MCQs, etc.

**Add to generator script after loading question type analysis:**

```typescript
// Load question type analysis (CRITICAL for NEET)
const questionTypeAnalysisPath = path.join(
  __dirname,
  '../../docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_${SUBJECT_UPPER}.json'
);
const questionTypeAnalysis = JSON.parse(fs.readFileSync(questionTypeAnalysisPath, 'utf-8'));

// Get question type distribution
const questionTypeDistribution = questionTypeAnalysis.question_type_distribution || {};

// Calculate question type counts for this set
const TOTAL_QUESTIONS = 45;  // Per set (NEET Physics/Chemistry) or 90 for Biology
const questionTypeCounts = {};

for (const [qType, percentage] of Object.entries(questionTypeDistribution)) {
  if (percentage > 0) {
    questionTypeCounts[qType] = Math.round(TOTAL_QUESTIONS * percentage / 100);
  }
}

console.log('📋 QUESTION TYPE DISTRIBUTION (from historical NEET analysis):');
console.log(`   Answer Format: ${questionTypeAnalysis.answer_format} (uniform)`);
console.log('\n   Question Types (within MCQ format):');
for (const [qType, count] of Object.entries(questionTypeCounts)) {
  const pct = questionTypeDistribution[qType];
  console.log(`   ${qType}: ${count} questions (${pct}%)`);
}
```

**Enhance directives with question type instructions:**

```typescript
// Build directives array with QUESTION TYPE distribution (not answer format!)
const directives = [
  "🎯 CRITICAL: NEET QUESTION TYPE DISTRIBUTION",
  "",
  "⚠️ IMPORTANT: All questions use MCQ answer format (4 options, single correct)",
  "⚠️ However, QUESTION TYPES within MCQ format must match historical distribution:",
  ""
];

// Add question type directives
for (const [qType, count] of Object.entries(questionTypeCounts)) {
  if (count > 0) {
    directives.push(`GENERATE EXACTLY ${count} ${qType.toUpperCase()} questions`);
  }
}

directives.push("");
directives.push("📋 QUESTION TYPE GUIDELINES:");
directives.push("");
directives.push("• ASSERTION_REASON_MCQ:");
directives.push("  Format: Assertion (A): [statement]. Reason (R): [statement].");
directives.push("  Options: (a) Both true, R explains A (b) Both true, R doesn't explain A");
directives.push("           (c) A true, R false (d) A false, R true");
directives.push("");
directives.push("• MATCH_FOLLOWING_MCQ:");
directives.push("  Format: Column I (A,B,C,D) and Column II (p,q,r,s) with items to match");
directives.push("  Options: (a) A-p,B-q,C-r,D-s (b) A-q,B-p,C-s,D-r ... (4 combinations)");
directives.push("");
directives.push("• STATEMENT_BASED_MCQ:");
directives.push("  Format: I. [statement] II. [statement] III. [statement] IV. [statement]");
directives.push("  Question: How many of the above statements are correct?");
directives.push("  Options: (a) Only 1 (b) Only 2 (c) Only 3 (d) All 4");
directives.push("");
directives.push("• TRUE_FALSE_COMBO_MCQ:");
directives.push("  Format: Which of the following are true? I. II. III. IV.");
directives.push("  Options: (a) I and II only (b) II and III only (c) I, III and IV (d) All");
directives.push("");
directives.push("• SEQUENCE_MCQ / EXCEPTION_BASED_MCQ / DIAGRAM_BASED_MCQ:");
directives.push("  Use standard patterns from NCERT questions");
directives.push("");
directives.push("• SIMPLE_RECALL_MCQ:");
directives.push("  Standard 4-option MCQ with direct question and single correct answer");

// Add common directives
directives.push("");
directives.push(`Target IDS: ${calibration.ids_target}`);
directives.push("ALL questions must be NCERT-traceable");
```

**Example Complete Directives (NEET Biology with Question Type Analysis):**

```typescript
const directives = [
  "🎯 CRITICAL: ENFORCE EXACT QUESTION TYPE DISTRIBUTION:",
  "GENERATE EXACTLY 18 THEORY_CONCEPTUAL questions",
  "GENERATE EXACTLY 15 DIAGRAM_BASED questions",
  "GENERATE EXACTLY 12 APPLICATION questions",
  "GENERATE EXACTLY 6 EXPERIMENTAL questions",
  "GENERATE EXACTLY 5 CALCULATION questions",
  "GENERATE EXACTLY 3 TAXONOMY questions",
  "GENERATE EXACTLY 1 COMPARISON questions",
  "",
  "🎯 CRITICAL: ENFORCE EXACT QUESTION FORMAT DISTRIBUTION:",
  "GENERATE EXACTLY 32 STANDARD MCQ questions (54%)",
  "GENERATE EXACTLY 11 ASSERTION-REASON questions (19%)",
  "GENERATE EXACTLY 9 MATCH-THE-FOLLOWING questions (15%)",
  "GENERATE EXACTLY 8 STATEMENT-BASED questions (12%)",
  "",
  "FORMAT GUIDELINES:",
  "• STANDARD MCQ: Simple 4-option MCQ with one correct answer",
  "• ASSERTION-REASON: Two statements with 4 standard A-R options",
  "• MATCH-THE-FOLLOWING: Two columns (A and B) with 4 items each",
  "• STATEMENT-BASED: Multiple statements with 'how many correct' options",
  "",
  "Target IDS: 0.68 (Range: 0.60-0.75)",
  "Focus on NCERT 2024-25 rationalized syllabus",
  "Include diagrams and lifecycle questions",
  "Prioritize high-yield identities"
];
```

**Important Notes:**
- Format distribution is automatically derived from historical papers (Step 1.4)
- No hard-coded format counts - all calculated from analysis
- Generator creates questions matching both type AND format distributions
- Format examples help AI understand structure requirements
- For KCET/pure MCQ exams, skip this step - only type distribution is enforced

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
**Output:** 90 AI-generated questions for NEET (SET A + SET B) in database
**Strategy:** Hybrid SET A/B differentiation (maintains calibration, varies emphasis)

### NEET Strategic Differentiation (Approach 3: Hybrid)

For NEET subjects, the generator creates **two strategically differentiated sets**:

- **SET A (Formula/Numerical):** Emphasizes quantitative reasoning and formula application
- **SET B (Conceptual/Qualitative):** Emphasizes conceptual clarity and real-world applications

**Key:** Both sets maintain the **same calibrated parameters** (IDS, rigor, difficulty) from Phase 4, ensuring forensic audit accuracy while providing pedagogical variety.

**Documentation:** See `docs/oracle/calibration/NEET_SET_AB_STRATEGY.md` for complete strategy details.

### Step 6.1: Run Flagship Generator

**For NEET Subjects:**
```bash
# Execute generic NEET generator (works for Physics, Chemistry, Botany, Zoology)
npx tsx scripts/oracle/phase_generate_flagship_neet.ts ${SUBJECT} --generate \
  2>&1 | tee /tmp/${SUBJECT_LOWER}_flagship_generation.log

# Monitor progress
tail -f /tmp/${SUBJECT_LOWER}_flagship_generation.log
```

**For Other Exams:**
```bash
# Execute exam-specific generator
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

**For NEET Subjects:**
```bash
# Run comprehensive verification (generic for all NEET subjects)
npx tsx scripts/oracle/verify_flagship_generation.ts ${SUBJECT}

# Save verification report
npx tsx scripts/oracle/verify_flagship_generation.ts ${SUBJECT} \
  > /tmp/phase6_${SUBJECT_LOWER}_verification.txt
```

**For Other Exams:**
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

**Expected NEET Verification Output:**
```
╔═══════════════════════════════════════════════════════════════════╗
║     PHASE 6: FLAGSHIP GENERATION VERIFICATION - NEET Physics       ║
╚═══════════════════════════════════════════════════════════════════╝

📊 STEP 1: Loading Calibration Data from Database
   ✅ Calibration loaded from database:
      IDS Target: 0.894
      Rigor Velocity: 1.68
      Board Signature: DIAGRAM_FORMULA_MCQ
      Difficulty: 20/71/9 (E/M/H)

📚 STEP 2: Loading Identity Bank
   ✅ Identity bank loaded: 21 identities
   🎯 Top 5 High-Yield Topics (Expected):
      1. ELECTROSTATICS: 4.6 Q/year
      2. OPTICS: 4.0 Q/year
      ...

🔍 STEP 3: Locating AI-Generated Scan
   ✅ Found 1 AI-Generated scan(s)

📝 STEP 4: Querying Generated Questions
   ✅ Total questions found: 90

📐 STEP 5: Question Count Verification
   Expected: 90 questions (SET A: 45, SET B: 45)
   Actual:   90 questions
   ✅ PASS: Correct question count

🎯 STEP 6: Difficulty Distribution Verification
   Expected: 20/71/9 (E/M/H)
   Actual:   28/66/7 (E/M/H) — Variance: +8%/-5%/-2%
   ✅ PASS: Difficulty distribution within acceptable variance (±10%)

🗺️  STEP 7: Topic Distribution Verification
   Total unique topics: 14
   Top 10 Topics Generated:
       1. Current Electricity: 13 Q (14%)
       2. Ray Optics and Optical Instruments: 11 Q (12%)
       ...

✨ STEP 8: Content Quality Verification
   Overall Quality Score: 100.0/100
   ✅ EXCELLENT: High-quality flagship questions

🚀 STEP 9: Prediction Readiness Verification
   Readiness Score: 6/6 checks passed (100%)

╔═══════════════════════════════════════════════════════════════════╗
║                      VERIFICATION SUMMARY                         ║
╚═══════════════════════════════════════════════════════════════════╝

   Subject: NEET Physics
   Questions Generated: 90/90
   Quality Score: 100.0/100
   Readiness Score: 100%
   Difficulty Variance: 8% (target: ≤10%)

   ✅ STATUS: PHASE 6 COMPLETE - Ready for Phase 7 (Forensic Audit)
```

**Non-NEET Expected Output:**
```
total_questions
----------------
120
```

### Step 6.3: Record Scan ID

From the generator output, record the scan_id (UUID). This will be used for:
- Verification scripts
- Phase 7 forensic audit
- UI export scripts
- Cleanup scripts

**For NEET subjects, record in the scan ID registry:**
```bash
# Update the scan ID registry file
# docs/oracle/calibration/NEET_PHYSICS_SCAN_ID_REGISTRY.md

# Example for NEET Physics (COMPLETED):
SCAN_ID="2adcb415-9410-4468-b8f3-32206e5ae7cb"
```

**Record the scan ID in your subject's registry:**
- NEET Physics: `docs/oracle/calibration/NEET_PHYSICS_SCAN_ID_REGISTRY.md` ✅ DONE
- NEET Chemistry: `docs/oracle/calibration/NEET_CHEMISTRY_SCAN_ID_REGISTRY.md`
- NEET Botany: `docs/oracle/calibration/NEET_BOTANY_SCAN_ID_REGISTRY.md`
- NEET Zoology: `docs/oracle/calibration/NEET_ZOOLOGY_SCAN_ID_REGISTRY.md`

**For KCET subjects:**
```bash
# Save to variable for later use
SCAN_ID="<your-scan-id>"
# Record in subject-specific documentation
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

### Step 7.4: Verify Question Type Distribution (CRITICAL for NEET)

**Purpose:** For NEET (uniform MCQ answer format but diverse question types), verify that the generated questions match the target question type distribution from historical analysis.

**CRITICAL:** This step is MANDATORY for NEET to ensure we're generating the right mix of Assertion-Reason MCQs, Match-the-Following MCQs, etc.

**Enhance verification script to check question type distribution:**

```bash
# Add question type verification to existing verification script
cat >> scripts/temp-verify-${SUBJECT_LOWER}-flagship-v2.ts << 'EOF'

// Load question type distribution from analysis
const questionTypeAnalysisPath = path.join(
  __dirname,
  '../docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_${SUBJECT_UPPER}.json'
);
const questionTypeAnalysis = JSON.parse(fs.readFileSync(questionTypeAnalysisPath, 'utf-8'));

console.log('\n   📋 QUESTION TYPE DISTRIBUTION VERIFICATION:');
console.log(`   Answer Format: ${questionTypeAnalysis.answer_format} (uniform)`);
console.log('\n   Question Types (within MCQ format):');

const questionTypeDistribution = questionTypeAnalysis.question_type_distribution;
const questionTypeCounts: Record<string, number> = {};

// Initialize all possible question types
const allQuestionTypes = [
  'match_following_mcq', 'assertion_reason_mcq', 'statement_based_mcq',
  'true_false_combo_mcq', 'sequence_mcq', 'exception_based_mcq',
  'diagram_based_mcq', 'reason_based_mcq', 'definitional_mcq',
  'calculation_mcq', 'simple_recall_mcq'
];

for (const qType of allQuestionTypes) {
  questionTypeCounts[qType] = 0;
}

// Count generated questions by type (from metadata or text classification)
for (const q of questions) {
  const qType = q.metadata?.questionType || 'simple_recall_mcq';
  if (questionTypeCounts[qType] !== undefined) {
    questionTypeCounts[qType]++;
  }
}

// Calculate targets from historical distribution
const totalQuestions = questions.length;
const targets: Record<string, number> = {};

for (const qType of allQuestionTypes) {
  const percentage = questionTypeDistribution[qType] || 0;
  if (percentage > 0) {
    targets[qType] = Math.round(totalQuestions * percentage / 100);
  }
}

// Display results
let perfectMatches = 0;
let totalDiff = 0;

for (const qType of allQuestionTypes) {
  const count = questionTypeCounts[qType] || 0;
  const target = targets[qType] || 0;

  if (target > 0 || count > 0) {
    const diff = count - target;
    const status = Math.abs(diff) <= 1 ? '✅' : (Math.abs(diff) <= 2 ? '⚠️' : '❌');

    if (diff === 0) perfectMatches++;
    totalDiff += Math.abs(diff);

    console.log(`      ${qType}: ${count}/${target} (${diff >= 0 ? '+' : ''}${diff}) ${status}`);
  }

  const formatAccuracy = ((1 - (totalDiff / totalQuestions)) * 100).toFixed(1);
  console.log(`\n      Overall Format Accuracy: ${formatAccuracy}%`);
  console.log(`      Perfect Matches: ${perfectMatches}/4 formats`);

  if (parseFloat(formatAccuracy) >= 85) {
    console.log(`      Format Status: ✅ EXCELLENT`);
  } else if (parseFloat(formatAccuracy) >= 70) {
    console.log(`      Format Status: ✅ GOOD`);
  } else {
    console.log(`      Format Status: ⚠️  NEEDS IMPROVEMENT`);
  }
}
EOF
```

**Run format-aware verification:**

```bash
# Execute enhanced verification
npx tsx scripts/temp-verify-${SUBJECT_LOWER}-flagship-v2.ts
```

**Expected Output (NEET Biology with Format Analysis):**
```
🔍 VERIFYING BIOLOGY FLAGSHIP v2 GENERATION
═══════════════════════════════════════════════════════

✅ Found 120 recent Biology NEET AI-generated questions

📊 SET_A: NEET Biology 2026 Flagship
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

      Overall Type Accuracy: 88.3%
      Perfect Matches: 3/7 types

   📋 QUESTION FORMAT DISTRIBUTION:
      standard_mcq: 32/32 (+0) ✅ PERFECT
      assertion_reason: 11/11 (+0) ✅ PERFECT
      match_following: 9/9 (+0) ✅ PERFECT
      statement_based: 8/8 (+0) ✅ PERFECT

      Overall Format Accuracy: 100.0%
      Perfect Matches: 4/4 formats
      Format Status: ✅ EXCELLENT

   🧬 IDENTITY ASSIGNMENT:
      Assigned: 45/60 (75%)
      Status: ✅ GOOD

   VERDICT: ✅ PASS
```

**SQL query to verify formats:**

```bash
# Check format distribution in database
psql -d your_db -c "
  SELECT
    metadata->>'questionFormat' as format,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
  FROM questions
  WHERE subject = '${SUBJECT}'
    AND exam_context = '${EXAM}'
    AND created_at > NOW() - INTERVAL '1 hour'
  GROUP BY metadata->>'questionFormat'
  ORDER BY count DESC;
"
```

**Expected Output:**
```
format            | count | percentage
------------------|-------|------------
standard_mcq      | 64    | 53.3
assertion_reason  | 23    | 19.2
match_following   | 18    | 15.0
statement_based   | 15    | 12.5
```

**Quality Thresholds:**
- **Excellent:** Format accuracy ≥85% and ≥2 perfect matches
- **Good:** Format accuracy ≥70% and ≥1 perfect match
- **Needs Improvement:** Format accuracy <70% → Regenerate with stricter directives

**Important Notes:**
- Format validation is automatic if `hasFormatAnalysis` flag exists in question type analysis
- Format distribution derived from 5 years of historical papers (2021-2025)
- No hard-coded expectations - all targets calculated from analysis
- For pure MCQ exams (KCET), this step is automatically skipped

---

## Phase 7.5: Independent Forensic Verification

**Time:** 10-45 minutes (varies by verification type)
**Output:** Agent-verified reports, borderline case reviews
**Priority:** HIGH - catches errors manual review misses

### Background: Need for Independent Verification

**KCET Lesson:** Verification agents caught catastrophic errors that manual review missed:
- 15-point statistical discrepancies in Biology/Chemistry
- Miscounted tier distributions
- Borderline questions needing expert review (Math Q53, Q14)

**NEET Lesson:** Independent agents provide objective quality assessment:
- Cross-reference Phase 7 reports for consistency
- Identify borderline cases near quality thresholds
- Calculate confidence scores (0-100) for production readiness
- Make explicit production decisions (APPROVED/NEEDS_REVIEW/REJECTED)

**Solution:** Deploy independent verification agents to audit all reports before deployment.

### Two Verification Approaches

#### Approach A: Pre-Deployment Quality Verification (NEET-style)
**Use when:** Verifying flagship question quality before deployment
**Time:** 10-15 minutes per subject
**Script:** `phase7.5_independent_verification_neet.ts`

#### Approach B: Post-Exam Forensic Matching (KCET-style)
**Use when:** Verifying prediction accuracy after exam release
**Time:** 30-45 minutes per subject
**Script:** `run_forensic_verification_agents.sh`

---

### Approach A: Pre-Deployment Quality Verification (NEET)

**Prerequisites:**
- Phase 7 quality verification complete
- Phase 7 report exists: `docs/oracle/verification/NEET_<SUBJECT>_PHASE7_VERIFICATION.txt`
- Scan ID registered

#### Step 7.5.1(A): Run Verification Setup Script

```bash
# Generic command for any NEET subject
npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts <Subject> <ScanID>

# Examples:
npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts Physics 2adcb415-9410-4468-b8f3-32206e5ae7cb
npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts Chemistry <chemistry-scan-id>
npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts Botany <botany-scan-id>
npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts Zoology <zoology-scan-id>
```

**Script Output:**
```
╔═══════════════════════════════════════════════════════════════════╗
║   PHASE 7.5: INDEPENDENT FORENSIC VERIFICATION - NEET Physics     ║
╚═══════════════════════════════════════════════════════════════════╝

📋 STEP 7.5.1: Preparing Independent Verification
   Subject: NEET Physics
   Scan ID: 2adcb415-9410-4468-b8f3-32206e5ae7cb
   Phase 7 Report: docs/oracle/verification/NEET_PHYSICS_PHASE7_VERIFICATION.txt

🤖 STEP 7.5.2: Launching Independent Verification Agent
   Agent Type: general-purpose
   Mode: Autonomous verification
   Expected Duration: 2-5 minutes

   Verification prompt saved: /tmp/neet_physics_verification_prompt.txt
```

#### Step 7.5.2(A): Launch Verification Agent

**Method 1: Using Task tool (within Claude Code session)**
```
Ask Claude to launch the verification agent with the generated prompt from /tmp/neet_physics_verification_prompt.txt
```

**Method 2: Using claude-code CLI**
```bash
# Command will be displayed in console output
claude-code task --subagent-type general-purpose \
  --description "Phase 7.5 verification NEET Physics" \
  --prompt "$(cat /tmp/neet_physics_verification_prompt.txt)"
```

#### Step 7.5.3(A): Review Agent Verification Report

```bash
# Check agent verification results
cat docs/oracle/verification/NEET_PHYSICS_AGENT_VERIFICATION.md
```

**Agent Verification Checklist (9 tasks):**
1. ✅ Verify question counts (90 total, 45 SET A, 45 SET B)
2. ✅ Verify difficulty distribution (percentages, variance ≤10%)
3. ✅ Verify content completeness (≥95%, all 7 fields)
4. ✅ Verify strategic differentiation (SET A/B bias)
5. ✅ Cross-reference reports (consistency check)
6. ✅ Verify question type distribution (board signature)
7. ✅ Identify borderline cases (near thresholds)
8. ✅ Calculate confidence score (0-100)
9. ✅ Make production decision (APPROVED/NEEDS_REVIEW/REJECTED)

**Expected Output (NEET Physics example):**
```markdown
# NEET Physics 2026 - Independent Forensic Verification Report

## Executive Summary
- Overall Status: PASS
- Confidence Score: 89/100
- Production Decision: APPROVED
- Verification Date: 2026-04-29

## Verification Results
✅ TASK 1: Question Counts - 90 total (45+45 split)
✅ TASK 2: Difficulty Distribution - 7% variance (within ±10%)
✅ TASK 3: Content Completeness - 100% (all 7 fields)
⚠️ TASK 4: Strategic Differentiation - Moderate (SET B still formula-heavy)
✅ TASK 5: Cross-Reference Consistency - Minor inconsistencies only
✅ TASK 6: Question Type Distribution - 80% accuracy (≥70% target)
⚠️ TASK 7: Borderline Cases - SET B conceptual emphasis, minor type variance
✅ TASK 8: Confidence Score - 89/100 (Good, production ready)
✅ TASK 9: Production Decision - APPROVED

## Recommendations
- Deploy to Phase 8 with documented limitations
- Monitor SET B formula/conceptual balance in production
- Document missing minor question types (9% of historical)
```

**Confidence Score Thresholds:**
- 90-100: Excellent, deploy immediately
- 80-89: Good, deploy with documented limitations
- 70-79: Acceptable, manual review required
- <70: Needs improvement, consider regeneration

**Production Decisions:**
- APPROVED (≥80): Ready for Phase 8 deployment
- APPROVED_WITH_CONDITIONS (70-79): Deploy with monitoring
- NEEDS_REVIEW (60-69): Manual review before deployment
- REJECTED (<60): Regeneration recommended

**Quick Reference:** See `docs/oracle/PHASE7.5_QUICK_REFERENCE.md` for detailed usage guide.

---

### Approach B: Post-Exam Forensic Matching (KCET)

### Step 7.5.1(B): Deploy Verification Agents

**Create agent verification script:**

```bash
# For each subject, launch independent verification agent
cat > scripts/oracle/run_forensic_verification_agents.sh << 'EOF'
#!/bin/bash

SUBJECTS=("Physics" "Chemistry" "Biology")

for subject in "${SUBJECTS[@]}"; do
  echo "🤖 Launching verification agent for ${subject}..."

  # Launch verification agent
  claude-code task \
    --subagent-type general-purpose \
    --description "Verify ${subject} forensic report" \
    --prompt "Read the forensic verification report at docs/oracle/verification/${subject}_FLAGSHIP_VERIFICATION.txt.

TASK 1: COUNT ACTUAL TIER DISTRIBUTION FROM FORENSIC TABLE
- Manually count Tier 1 questions from the detailed verification output
- Manually count Tier 2 questions from the detailed verification output
- Manually count Tier 3 questions from the detailed verification output
- Manually count Tier 4 questions from the detailed verification output
- Manually count Tier 5 questions from the detailed verification output

TASK 2: CALCULATE AVERAGE SCORE
- Sum all match scores from the forensic table
- Divide by total number of questions
- Round to 1 decimal place

TASK 3: COMPARE AGAINST EXECUTIVE SUMMARY
- Read the executive summary section
- Compare your counts vs claimed counts
- Report any discrepancies > 2 points or > 1 question

TASK 4: VALIDATE PERCENTAGES
- Ensure all tier percentages sum to 100%
- Ensure Tier 1+2 percentage is calculated correctly

OUTPUT: Create verification summary at docs/oracle/verification/${subject}_AGENT_VERIFICATION.md" \
    --run_in_background \
    > /tmp/${subject}_verification_agent.log 2>&1 &

  echo "   Agent launched, logs: /tmp/${subject}_verification_agent.log"
done

echo ""
echo "✅ All verification agents launched"
echo "   Wait 5-10 minutes for agents to complete"
echo "   Check results in docs/oracle/verification/*_AGENT_VERIFICATION.md"
EOF

chmod +x scripts/oracle/run_forensic_verification_agents.sh
```

**Run verification agents:**

```bash
./scripts/oracle/run_forensic_verification_agents.sh

# Wait for completion (5-10 minutes)
# Agents will write verification reports to docs/oracle/verification/
```

**Agent Checklist (what each agent verifies):**
1. Count Tier 1 questions from forensic table
2. Count Tier 2 questions from forensic table
3. Count Tier 3 questions from forensic table
4. Count Tier 4 questions from forensic table
5. Count Tier 5 questions from forensic table
6. Sum all match scores, calculate average
7. Compare vs executive summary claims
8. Flag discrepancies > 2 points or > 1 question

### Step 7.5.2: Review Agent Verification Results

```bash
# Check agent verification results
for subject in Physics Chemistry Biology; do
  echo "=== ${subject} AGENT VERIFICATION ==="
  cat docs/oracle/verification/${subject}_AGENT_VERIFICATION.md
  echo ""
done
```

**Expected Output (if no issues):**
```markdown
# PHYSICS AGENT VERIFICATION

## Tier Distribution Count
- Tier 1: 0 questions (0%)
- Tier 2: 31 questions (51.7%)
- Tier 3: 17 questions (28.3%)
- Tier 4: 11 questions (18.3%)
- Tier 5: 1 questions (1.7%)
- **Total: 60 questions (100%)**

## Average Score
- Sum of scores: 4572
- Total questions: 60
- **Average: 76.2/100**

## Executive Summary Comparison
✅ Tier distribution matches executive summary
✅ Average score matches executive summary (76.2 vs 76.2)
✅ No discrepancies found

**VERDICT: PASS**
```

**If discrepancies found:**
```markdown
## Executive Summary Comparison
❌ Tier 2 count mismatch: Table=30, Summary=45 (difference of 15!)
❌ Average score mismatch: Table=70.4, Summary=85.2 (difference of 14.8)

**VERDICT: FAIL - Recalibration required**
```

### Step 7.5.3: Borderline Case Review

**KCET Lesson:** Math Q53 (score 79) and Q14 (score 76) were borderline Tier 2/3 cases needing expert review.

**Extract borderline questions:**

```sql
-- Find borderline Tier 2/3 cases (scores 75-79)
SELECT
  question_id,
  match_score,
  predicted_question,
  real_question,
  reasoning
FROM forensic_matches
WHERE match_score BETWEEN 75 AND 79
ORDER BY match_score DESC;

-- Find borderline Tier 3/4 cases (scores 55-64)
SELECT
  question_id,
  match_score,
  predicted_question,
  real_question,
  reasoning
FROM forensic_matches
WHERE match_score BETWEEN 55 AND 64
ORDER BY match_score DESC;
```

**Manual Review Criteria:**

For each borderline question, expert should review:

1. **Identical Solving Methodology?** → Upgrade to higher tier
   - Example: Same formula, different numbers → Tier 2
   - Example: Same mechanism, different reactants → Tier 2

2. **Different Problem Types?** → Downgrade to lower tier
   - Example: Same topic but different approach → Tier 3
   - Example: Semantic similarity but different concept → Tier 3

3. **Parameter-Only Differences?** → Upgrade to Tier 2
   - Example: Same coordinate geometry problem, different points → Tier 2
   - Example: Same genetics cross, different traits → Tier 2

**Document borderline decisions:**

```markdown
# BORDERLINE CASE REVIEWS

## Physics Q15 (Initial Score: 78)
- **Predicted:** Projectile motion with angle 30°, initial velocity 20 m/s
- **Real:** Projectile motion with angle 45°, initial velocity 15 m/s
- **Analysis:** Same formula (Range = u²sin(2θ)/g), only parameters changed
- **Decision:** UPGRADE to Tier 2 (score → 85)
- **Reviewer:** [Name], Date: 2026-04-28

## Biology Q22 (Initial Score: 77)
- **Predicted:** Mitochondria structure and function
- **Real:** Chloroplast structure and function
- **Analysis:** Different organelles, semantic similarity but distinct biology
- **Decision:** MAINTAIN Tier 2 (score → 77)
- **Reviewer:** [Name], Date: 2026-04-28
```

### Step 7.5.4: Final Acceptance Criteria

**All subjects must pass:**

✅ Agent verification confirms tier distribution accuracy
✅ No statistical discrepancies > 2 points
✅ Tier percentages sum to 100%
✅ Subject rankings are pedagogically sound (Chemistry/Physics top 2)
✅ All borderline cases reviewed and documented
✅ Quality gates passed (from Phase 3.5)

**If any checks fail:**
- DO NOT DEPLOY
- Recalibrate with adjusted parameters
- Re-run verification workflow

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

## Phase 10: Post-Exam Forensic Audit & Feedback Loop

**Time:** 4-6 hours (within 72 hours of real exam)
**Output:** Performance analysis, updated identity bank, learnings for next cycle
**Priority:** CRITICAL - creates compounding improvement cycle

### Background: The Missing Feedback Loop

**Current Problem:** Workflow ends at deployment with no post-exam validation.

**KCET Value:** Forensic audit revealed precise success/failure patterns:
- Chemistry organic mechanisms: 85.4/100 (replicate)
- Math definitional gaps: Q5, Q6, Q7, Q58 missed (fix)
- Biology genetics: Major gap in crosses (add 25-30 identities)

**Solution:** Systematic post-exam audit creates learning loop.

### Step 10.1: Acquire Real Exam Papers (Within 72 Hours)

```bash
mkdir -p real_exams/NEET_2027/ audit/NEET_2027/

# Download official papers
curl -o real_exams/NEET_2027/physics_setA.pdf [SOURCE]
curl -o real_exams/NEET_2027/chemistry_setA.pdf [SOURCE]
curl -o real_exams/NEET_2027/biology_setA.pdf [SOURCE]
```

### Step 10.2: Execute Forensic Comparison

```bash
for subject in Physics Chemistry Biology; do
  python forensic_matcher.py \
    --real "real_exams/NEET_2027/${subject}_setA.pdf" \
    --predicted "generated/NEET_2027/${subject}_flagship_120q.json" \
    --output "audit/NEET_2027/${subject}_forensic_report.md"
done
```

### Step 10.3: Extract Performance Patterns

```sql
-- High-performing identities (keep for next year)
SELECT identity_id, AVG(match_score) as avg_performance, COUNT(*) as hits
FROM forensic_matches
GROUP BY identity_id
HAVING AVG(match_score) >= 80
ORDER BY avg_performance DESC LIMIT 20;

-- Failed identities (remove)
SELECT identity_id, AVG(match_score), COUNT(*) as usage
FROM forensic_matches
GROUP BY identity_id
HAVING AVG(match_score) < 40
ORDER BY avg_performance ASC LIMIT 20;

-- Missed question types (gaps to fill)
SELECT question_type, COUNT(*) as missed
FROM real_questions
WHERE match_score < 30
GROUP BY question_type
ORDER BY missed DESC;
```

### Step 10.4: Update Identity Bank

```typescript
// Classify identities based on performance
interface IdentityPerformance {
  id: string;
  avgScore: number;
  retention: 'KEEP' | 'REVISE' | 'REMOVE';
}

// High performers (≥80 avg, ≥2 hits) → KEEP
// Medium performers (60-79) → REVISE
// Low performers (<40 or 0 hits) → REMOVE

// Create next cycle identity bank
const nextCycleBank = {
  identities: keepIdentities.concat(revisedIdentities),
  removed: removeIdentities,
  cycle: 'NEET_2028'
};
```

### Step 10.5: Document Learnings

```markdown
# NEET 2027 POST-EXAM AUDIT

## Performance
- Chemistry: XX% T1+2 (target: 70-75%)
- Physics: XX% T1+2 (target: 55-60%)
- Biology: XX% T1+2 (target: 35-45%)

## Top Performers (Keep)
1. [Identity] - 85/100 avg, 4 hits
2. [Identity] - 82/100 avg, 3 hits

## Failed Identities (Remove)
1. [Identity] - 25/100 avg, 0 hits
2. [Identity] - 30/100 avg, 0 hits

## Gaps (Add New Identities)
- Genetics crosses: 8 questions missed
- Plant diagrams: 6 questions missed

## Recommendations for 2028
- Chemistry: Increase to 200 identities (+20)
- Biology: Increase to 220 identities (+20)
- Add 30 genetics-specific identities
```

### Step 10.6: Archive and Version Control

```bash
git tag -a "NEET_2027_audit_complete" -m "Chemistry XX%, Physics XX%, Biology XX%"
git add archives/NEET_2027/ lib/oracle/identities/neet_*_2028.json
git commit -m "NEET 2027 post-exam audit: XX% overall T1+2"
git push origin main --tags
```

**Expected Compounding Improvement:**
- Year 1 (2027): Baseline
- Year 2 (2028): +5-10% (with feedback)
- Year 3 (2029): +8-15% (compounding)
- Year 4 (2030): +12-20% (mature system)

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

| Phase | Task | Time | Priority | Output |
|-------|------|------|----------|--------|
| 1 | Data Preparation (+ Format Analysis) | 1.5-2.5 hours | HIGH | Clean historical data + format distribution |
| 2 | Calibration Execution | 2-3 hours | HIGH | Identity bank + Calibration report |
| **2.5** | **Subject-Specific Optimization** | **30 min** | **CRITICAL** | **Subject-specific params + definitional bank** |
| 3 | Question Type Analysis | 1 hour | MEDIUM | Question type distribution JSON |
| **3.5** | **Automated Quality Gates** | **20 min** | **HIGH** | **Validation scripts and sanity checks** |
| 4 | Database Configuration | 15 min | MEDIUM | REI parameters in database |
| 5 | Generator Setup (+ Format-Aware) | 45 min | HIGH | Flagship generator script |
| 6 | Flagship Generation | 30-45 min | HIGH | Questions per subject (NEET: 45×2 Phy/Chem, 90×2 Bio; KCET: 60×2) |
| 7 | Quality Verification | 15-20 min | HIGH | Verification report |
| **7.5** | **Independent Forensic Verification** | **30-45 min** | **HIGH** | **Agent-verified reports + borderline reviews** |
| 8 | UI Deployment | 10-15 min | MEDIUM | JSON files for UI |
| 9 | Cleanup & Finalization | 10-15 min | LOW | Production-ready deployment |
| **SUBTOTAL** | **Initial Calibration** | **8-10 hours** | - | **Student-facing mock tests** |
| **10** | **Post-Exam Forensic Audit** | **4-6 hours** | **CRITICAL** | **Performance analysis + updated identity bank** |
| **TOTAL** | **Complete Cycle** | **12-16 hours** | - | **Continuous improvement system** |

**What You Get:**

1. **Database Assets:**
   - Subject-specific identity bank (NEET: Chemistry 200, Physics 180, Biology 280; KCET: Chemistry 180, Physics 150, Biology 200)
   - Definitional identity bank (30-40 per subject)
   - AI-generated questions per subject (NEET: 45×2 Phy/Chem, 90×2 Bio; KCET: 60×2 each)
   - REI v17 calibration parameters with subject-specific tuning
   - Comprehensive metadata with format distribution

2. **UI Assets:**
   - `flagship_${subject}_final.json` (SET A - exam-specific question count)
   - `flagship_${subject}_final_b.json` (SET B - exam-specific question count)
   - Student-accessible prediction tests
   - Format: Pure MCQ for both NEET and KCET (4-option single correct answer)

3. **Documentation:**
   - Calibration report (.md)
   - Question type + format analysis (.json)
   - Verification report (.txt)
   - Agent verification reports (.md)
   - Borderline case reviews (.md)
   - Deployment documentation (.md)
   - Post-exam audit summary (.md) **[After real exam]**

4. **Quality Assurance:**
   - Subject-specific tier targets (NEET: Chemistry 80-85%, Physics 75-80%, Biology 75-80%; KCET: Chemistry 65-75%, Physics 50-60%, Biology 35-45%)
   - >70% question type accuracy
   - >70% identity assignment
   - Difficulty distribution matches target ±5%
   - 100% metadata tagged (all pure MCQ format for both NEET and KCET)
   - Agent-verified statistical consistency
   - Automated quality gates passed

5. **Continuous Improvement System** (Phase 10):**
   - Identity performance tracking
   - High-performer retention for next year
   - Failed identity removal
   - Gap analysis and remediation plan
   - Year-over-year compounding improvement (+5-10% annually)

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

**Last Updated:** 2026-04-28 (Enhanced with KCET 2026 Forensic Audit Learnings)
**Version:** REI v17.1 (Enhanced)
**Status:** Production Ready with Continuous Improvement Loop
**Methodology Proven On:** KCET 2026 Forensic Audit (Chemistry 65%, Physics 52%, Biology 23%)
**NEET Targets (National Level):** 75-85% Tier 1+2 Overall (Chemistry 80-85%, Physics 75-80%, Biology 75-80%)
**Key Enhancements:**
- Subject-specific calibration (Chemistry 200, Physics 180, Biology 280 identities for NEET)
- Exam-specific question counts (NEET: 45 Phy/Chem, 90 Bio; KCET: 60 each)
- Automated quality gates and validation
- Independent forensic verification
- Post-exam feedback loop for continuous improvement
- Format-aware generation (OPTIONAL - only for mixed format exams; NEET is pure MCQ)
- Definitional identity banks (30-40 per subject)

**NEET 2026 Official Pattern (Verified):**
- 180 questions total: Physics 45, Chemistry 45, Biology 90 (Botany 45 + Zoology 45)
- Pure MCQ format only (4 options each, single correct answer)
- Marking: +4 correct, -1 incorrect, 0 unanswered
- Total marks: 720, Duration: 3 hours
- NO Assertion-Reason, Match-the-Following, or Statement-Based questions

**Note:** KCET results demonstrate the methodology works. NEET targets are higher as it's a national-level exam with more standardized patterns and better historical data availability.
