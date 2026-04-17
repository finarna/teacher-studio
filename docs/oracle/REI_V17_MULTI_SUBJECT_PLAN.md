# REI v17 - Multi-Subject Replication Plan

**Current Status:** Math KCET Complete ✅
**Next Steps:** Replicate for Physics, Chemistry, Biology
**Goal:** Contextual question type analysis for ALL KCET subjects

---

## 🎯 Overview

REI v17 is currently implemented for **Math KCET** with:
- ✅ Question type analysis (2021-2025)
- ✅ Database storage (ai_universal_calibration)
- ✅ AI prompt generation (contextual mandate)
- ✅ Calibration pipeline integration

**Next:** Replicate this **exact same process** for:
1. **Physics KCET**
2. **Chemistry KCET**
3. **Biology KCET**

---

## 📊 What's Subject-Specific vs Generic

### ✅ Already Subject-Agnostic (Reusable Code)

| Component | File | Status |
|-----------|------|--------|
| **REI Engine** | `lib/reiEvolutionEngine.ts` | ✅ Takes `examContext` + `subject` as params |
| **Calibration Script** | `docs/oracle/calibration/scripts/kcet_math_iterative_calibration_2021_2025.ts` | ✅ Uses `SUBJECT` constant (easy to change) |
| **Question Comparator** | `lib/oracle/questionComparator.ts` | ✅ Subject-agnostic |
| **Parameter Adjuster** | `lib/oracle/parameterAdjuster.ts` | ✅ Subject-agnostic |
| **Database Tables** | All tables | ✅ Have `subject` column |

### ⚠️ Subject-Specific (Need Per-Subject Versions)

| Component | Current State | Action Needed |
|-----------|--------------|---------------|
| **Identity Bank** | `kcet_math.json` | Create `kcet_physics.json`, `kcet_chemistry.json`, `kcet_biology.json` |
| **Question Type Categories** | Math-specific (property_based, word_problem, etc.) | Define subject-specific categories |
| **AI Prompt Mandate** | Hardcoded for Math in `aiQuestionGenerator.ts` | Generalize with subject-specific templates |
| **Question Type Analysis Script** | `analyze_question_types_2021_2025.ts` | Parameterize for any subject |

---

## 🔬 Subject-Specific Question Type Categories

### Math (Current - DONE ✅)

```typescript
type MathQuestionType =
  | 'property_based'      // 69% - Theorems, identities, properties
  | 'word_problem'        // 19% - Application problems
  | 'computational'       // 8%  - Direct calculations
  | 'pattern_recognition' // 2%  - Series, binomial patterns
  | 'abstract';           // 2%  - Conceptual without numbers
```

### Physics (To Be Analyzed)

```typescript
type PhysicsQuestionType =
  | 'conceptual'          // Understanding principles (Newton's laws, etc.)
  | 'numerical_problem'   // Calculation-based (F=ma, kinematics)
  | 'derivation_based'    // Prove/derive formula or relationship
  | 'graph_analysis'      // Interpret v-t, a-t, F-x graphs
  | 'dimensional_analysis'// Units, dimensions verification
  | 'assertion_reason';   // Statement I and II type
```

**Expected Distribution:** TBD (analyze 2021-2025 papers)

### Chemistry (To Be Analyzed)

```typescript
type ChemistryQuestionType =
  | 'reaction_based'      // Chemical equations, balancing
  | 'conceptual'          // Theory, definitions, mechanisms
  | 'numerical_problem'   // Mole calculations, pH, thermodynamics
  | 'structure_based'     // IUPAC naming, bonding, hybridization
  | 'experimental'        // Lab techniques, apparatus, tests
  | 'assertion_reason';   // Statement type
```

**Expected Distribution:** TBD (analyze 2021-2025 papers)

### Biology (To Be Analyzed)

```typescript
type BiologyQuestionType =
  | 'factual'             // Direct recall (cell organelles, vitamins)
  | 'diagram_based'       // Identify structures, label parts
  | 'application'         // Apply concepts to scenarios
  | 'experimental'        // Experimental design, observations
  | 'assertion_reason'    // Statement I and II type
  | 'diagram_interpretation'; // Read charts, graphs, cycles
```

**Expected Distribution:** TBD (analyze 2021-2025 papers)

---

## 🚀 Replication Steps (Per Subject)

### Phase 1: Data Preparation

```bash
# 1. Verify papers exist in database
# Check: questions table has data for subject + years 2021-2025

SELECT year, COUNT(*)
FROM questions q
JOIN exam_historical_patterns p ON q.scan_id = p.scan_id
WHERE p.exam_context = 'KCET' AND p.subject = 'Physics'
GROUP BY year
ORDER BY year;

# Expected: 60 questions per year for 5 years = 300 total
```

### Phase 2: Question Type Analysis

**Create:** `scripts/oracle/analyze_question_types_2021_2025_SUBJECT.ts`

**Approach:** Copy Math script, customize categorization logic

**Example for Physics:**
```typescript
function categorizePhysicsQuestion(text: string, topic: string): PhysicsQuestionType {
  const t = text.toLowerCase();

  // Numerical problem indicators
  if (/calculate|find the (value|magnitude)|given.*find/i.test(text)) {
    return 'numerical_problem';
  }

  // Graph analysis indicators
  if (/graph|plot|v-t|a-t|versus|variation/i.test(text)) {
    return 'graph_analysis';
  }

  // Conceptual indicators
  if (/which.*following|statement.*true|principle|law of/i.test(text)) {
    return 'conceptual';
  }

  // Assertion-Reason
  if (/assertion.*reason|statement i.*statement ii/i.test(text)) {
    return 'assertion_reason';
  }

  // Dimensional analysis
  if (/dimension|unit|si unit|dimensional formula/i.test(text)) {
    return 'dimensional_analysis';
  }

  return 'conceptual'; // Default
}
```

**Run:**
```bash
npx tsx scripts/oracle/analyze_question_types_2021_2025_physics.ts
```

**Output:**
- `docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_PHYSICS.json`
- Updates `ai_universal_calibration` table for Physics

### Phase 3: Create Identity Bank

**Create:** `lib/oracle/identities/kcet_physics.json`

**Structure:**
```json
{
  "version": "REI v17.0",
  "subject": "Physics",
  "exam": "KCET",
  "identities": [
    {
      "id": "PHY-001",
      "name": "Newton's Second Law Application",
      "topic": "Laws of Motion",
      "logic": "F = ma with constraint forces (friction, tension, normal)",
      "high_yield": true,
      "confidence": 0.5,
      "logic_cluster": "CORE_MECHANICS"
    }
    // ... more identities
  ],
  "calibration": {
    "status": "PENDING",
    "updated_at": null
  }
}
```

**Source:** Extract from historical papers or expert knowledge

### Phase 4: Enhance AI Generator for Subject

**Update:** `lib/aiQuestionGenerator.ts`

**Current (Math-specific):**
```typescript
const questionTypeMandate = isOracle && examContext === 'KCET' && subject === 'Math'
  ? `QUESTION TYPE DISTRIBUTION (Math specific)...`
  : '';
```

**Enhanced (Subject-agnostic):**
```typescript
const questionTypeMandate = isOracle && examContext === 'KCET'
  ? getQuestionTypeMandateForSubject(
      subject,
      generationRules?.oracleMode?.intentSignature?.questionTypeProfile,
      totalInBatch
    )
  : '';

function getQuestionTypeMandateForSubject(
  subject: string,
  profile: any,
  totalQuestions: number
): string {
  if (!profile) return '';

  switch (subject.toLowerCase()) {
    case 'math':
    case 'mathematics':
      return generateMathQuestionTypeMandate(profile, totalQuestions);

    case 'physics':
      return generatePhysicsQuestionTypeMandate(profile, totalQuestions);

    case 'chemistry':
      return generateChemistryQuestionTypeMandate(profile, totalQuestions);

    case 'biology':
      return generateBiologyQuestionTypeMandate(profile, totalQuestions);

    default:
      return '';
  }
}
```

### Phase 5: Run Calibration

**Create:** `docs/oracle/calibration/scripts/kcet_SUBJECT_iterative_calibration_2021_2025.ts`

**Or Parameterize:**
```typescript
const SUBJECT = process.argv[2] || 'Math'; // Accept subject as argument
const EXAM_CONTEXT = 'KCET';
```

**Run:**
```bash
npx tsx docs/oracle/calibration/scripts/kcet_physics_iterative_calibration_2021_2025.ts
```

**This will:**
1. Analyze question types (Phase 1.5)
2. Calibrate identity confidences (Phase 2-5)
3. Update all database tables (Phase 7)
4. Generate reports

### Phase 6: Generate Flagship Papers

```bash
npx tsx scripts/oracle/generate_flagship_oracle.ts KCET Physics
npx tsx scripts/oracle/generate_flagship_oracle.ts KCET Chemistry
npx tsx scripts/oracle/generate_flagship_oracle.ts KCET Biology
```

**Output:**
- `flagship_physics_final.json` (SET A)
- `flagship_physics_final_b.json` (SET B)
- (same for Chemistry, Biology)

---

## 📋 Checklist Per Subject

### Physics

- [ ] Verify 300 questions in database (2021-2025)
- [ ] Define PhysicsQuestionType categories
- [ ] Create `analyze_question_types_2021_2025_physics.ts`
- [ ] Run analysis, get distribution
- [ ] Create `kcet_physics.json` identity bank
- [ ] Add Physics mandate to `aiQuestionGenerator.ts`
- [ ] Run calibration script
- [ ] Generate flagship SET A & SET B
- [ ] Verify quality (expected 85/100+)

### Chemistry

- [ ] Verify 300 questions in database (2021-2025)
- [ ] Define ChemistryQuestionType categories
- [ ] Create `analyze_question_types_2021_2025_chemistry.ts`
- [ ] Run analysis, get distribution
- [ ] Create `kcet_chemistry.json` identity bank
- [ ] Add Chemistry mandate to `aiQuestionGenerator.ts`
- [ ] Run calibration script
- [ ] Generate flagship SET A & SET B
- [ ] Verify quality (expected 85/100+)

### Biology

- [ ] Verify 300 questions in database (2021-2025)
- [ ] Define BiologyQuestionType categories
- [ ] Create `analyze_question_types_2021_2025_biology.ts`
- [ ] Run analysis, get distribution
- [ ] Create `kcet_biology.json` identity bank
- [ ] Add Biology mandate to `aiQuestionGenerator.ts`
- [ ] Run calibration script
- [ ] Generate flagship SET A & SET B
- [ ] Verify quality (expected 85/100+)

---

## 🎯 Expected Outcomes (Per Subject)

### After Complete Replication

**Database Tables:**
```
ai_universal_calibration:
├─ KCET Math 2026   ✅ (Complete)
├─ KCET Physics 2026 (Pending)
├─ KCET Chemistry 2026 (Pending)
└─ KCET Biology 2026 (Pending)

Each with:
  - rigor_velocity
  - difficultyProfile
  - questionTypeProfile (subject-specific)
```

**Identity Banks:**
```
lib/oracle/identities/
├─ kcet_math.json       ✅ (30 identities)
├─ kcet_physics.json    (TBD - 25-30 identities)
├─ kcet_chemistry.json  (TBD - 25-30 identities)
└─ kcet_biology.json    (TBD - 25-30 identities)
```

**Flagship Papers:**
```
Root directory:
├─ flagship_final.json              ✅ Math SET A
├─ flagship_final_b.json            ✅ Math SET B
├─ flagship_physics_final.json      (Pending)
├─ flagship_physics_final_b.json    (Pending)
├─ flagship_chemistry_final.json    (Pending)
├─ flagship_chemistry_final_b.json  (Pending)
├─ flagship_biology_final.json      (Pending)
└─ flagship_biology_final_b.json    (Pending)
```

---

## 💡 Key Insights to Remember

### 1. Question Type Categories are Subject-Specific

**Math:** Property-based dominates (69%)
**Physics:** Likely numerical_problem + conceptual (TBD)
**Chemistry:** Likely reaction_based + numerical (TBD)
**Biology:** Likely factual + diagram_based (TBD)

### 2. Each Subject Needs Independent Calibration

**Why?** Each subject has:
- Different difficulty trends
- Different identity patterns
- Different question type distributions
- Different board signatures (SYNTHESIZER vs LOGICIAN vs INTIMIDATOR)

### 3. Database Schema is Already Multi-Subject Ready

**Tables:**
- ✅ `ai_universal_calibration` has `subject` column
- ✅ `rei_evolution_configs` has `subject` column
- ✅ `exam_historical_patterns` has `subject` column

**No schema changes needed!**

### 4. AI Generator is Flexible

**Current approach:**
```typescript
if (subject === 'Math') {
  // Math-specific mandate
} else if (subject === 'Physics') {
  // Physics-specific mandate
} // etc.
```

**Better approach:** Function per subject
```typescript
const mandates = {
  Math: generateMathMandate,
  Physics: generatePhysicsMandate,
  Chemistry: generateChemistryMandate,
  Biology: generateBiologyMandate
};

const mandate = mandates[subject]?.(profile, totalQuestions) || '';
```

---

## 🚀 Recommended Order of Implementation

### Week 1: Physics (High Similarity to Math)
- Similar numerical/computational focus
- Graph analysis is unique to Physics
- Expected difficulty: Medium

### Week 2: Chemistry (Moderate Complexity)
- Mix of numerical + conceptual + reactions
- IUPAC naming and structure recognition unique
- Expected difficulty: Medium-High

### Week 3: Biology (Most Different from Math)
- Heavy on factual recall and diagrams
- Less numerical, more descriptive
- Expected difficulty: High (new pattern type)

---

## 📊 Expected Question Type Distributions (Predictions)

### Physics (Hypothesis - To Be Validated)

| Type | Predicted % | Rationale |
|------|------------|-----------|
| Numerical Problem | 40-50% | KCET Physics is calculation-heavy |
| Conceptual | 25-35% | Understanding principles |
| Graph Analysis | 10-15% | v-t, F-x, V-I graphs common |
| Assertion-Reason | 5-10% | KCET pattern |
| Dimensional/Derivation | 5-10% | Units and proofs |

### Chemistry (Hypothesis - To Be Validated)

| Type | Predicted % | Rationale |
|------|------------|-----------|
| Reaction-Based | 30-40% | Equations, balancing, products |
| Conceptual | 20-30% | Mechanisms, theory |
| Numerical Problem | 20-25% | Mole, pH, thermodynamics |
| Structure-Based | 10-15% | IUPAC, bonding |
| Experimental | 5-10% | Lab techniques |

### Biology (Hypothesis - To Be Validated)

| Type | Predicted % | Rationale |
|------|------------|-----------|
| Factual | 40-50% | Recall-heavy (cell parts, vitamins, diseases) |
| Diagram-Based | 20-30% | Label structures, identify parts |
| Application | 15-20% | Apply concepts to scenarios |
| Assertion-Reason | 5-10% | KCET pattern |
| Experimental | 5-10% | Experimental design |

---

## 🔄 Continuous Learning (Cross-Subject)

**After completing all 4 subjects:**

1. **Compare patterns across subjects:**
   - Which has highest IDS?
   - Which is most property-based?
   - Which is most word-problem based?

2. **Identify common themes:**
   - All subjects have assertion-reason?
   - Difficulty trends similar?
   - Board signature consistent?

3. **Refine generic calibration logic:**
   - Can we predict question types without analysis?
   - Are there universal KCET patterns?
   - Can we build a meta-model?

---

## 📁 Final Directory Structure

```
edujourney---universal-teacher-studio/
├── lib/oracle/identities/
│   ├── kcet_math.json       ✅
│   ├── kcet_physics.json    (TODO)
│   ├── kcet_chemistry.json  (TODO)
│   └── kcet_biology.json    (TODO)
├── docs/oracle/
│   ├── QUESTION_TYPE_ANALYSIS_2021_2025_MATH.json     ✅
│   ├── QUESTION_TYPE_ANALYSIS_2021_2025_PHYSICS.json  (TODO)
│   ├── QUESTION_TYPE_ANALYSIS_2021_2025_CHEMISTRY.json (TODO)
│   ├── QUESTION_TYPE_ANALYSIS_2021_2025_BIOLOGY.json  (TODO)
│   └── calibration/
│       ├── KCET_MATH_CALIBRATION_REPORT_2021_2025.md     ✅
│       ├── KCET_PHYSICS_CALIBRATION_REPORT_2021_2025.md  (TODO)
│       ├── KCET_CHEMISTRY_CALIBRATION_REPORT_2021_2025.md (TODO)
│       └── KCET_BIOLOGY_CALIBRATION_REPORT_2021_2025.md  (TODO)
├── scripts/oracle/
│   ├── analyze_question_types_2021_2025.ts (Generic - parameterized)
│   └── generate_flagship_oracle.ts (Already multi-subject ready ✅)
└── Root/
    ├── flagship_final.json (Math SET A)        ✅
    ├── flagship_final_b.json (Math SET B)      ✅
    ├── flagship_physics_final.json             (TODO)
    ├── flagship_physics_final_b.json           (TODO)
    ├── flagship_chemistry_final.json           (TODO)
    ├── flagship_chemistry_final_b.json         (TODO)
    ├── flagship_biology_final.json             (TODO)
    └── flagship_biology_final_b.json           (TODO)
```

---

**Document Version:** 1.0
**Current Progress:** 1/4 subjects complete (Math ✅)
**Next Subject:** Physics (recommended)
**Estimated Time per Subject:** 1-2 days (with existing framework)
