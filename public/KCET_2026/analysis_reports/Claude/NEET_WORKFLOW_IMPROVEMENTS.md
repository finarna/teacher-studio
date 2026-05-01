# NEET CALIBRATION WORKFLOW IMPROVEMENTS
## Based on KCET 2026 Forensic Audit Results

**Generated:** 2026-04-28
**Source:** KCET 2026 4-Subject Forensic Analysis
**Purpose:** Enhance REPEATABLE_CALIBRATION_WORKFLOW.md for better NEET predictions

---

## EXECUTIVE SUMMARY

KCET 2026 forensic audit revealed dramatic performance variance across subjects:

| Subject | Average Score | Tier 1+2 Success | Grade | Performance |
|---------|--------------|------------------|-------|-------------|
| **Chemistry** | 81.4/100 | 65.0% | A- | **EXCELLENT** |
| **Physics** | 76.2/100 | 51.7% | B+ | **GOOD** |
| **Biology** | 55.7/100 | 23.3% | C+ | **WEAK** |
| **Mathematics** | 52.4/100 | 13.3% | C | **CRITICAL** |

**Key Insight:** Current calibration workflow produces highly inconsistent results. Chemistry's 65% success vs Math's 13% success indicates workflow lacks subject-specific optimization.

**Critical Need:** NEET predictions require subject-aware calibration to avoid Math-like failures in NEET Biology/Physics/Chemistry.

---

## RECOMMENDED WORKFLOW CHANGES

### 1. PHASE 2 ENHANCEMENT: Subject-Specific Calibration Parameters

**Current Limitation:** Uniform calibration approach treats all subjects equally.

**KCET Evidence:**
- Chemistry success driven by: Organic mechanisms (85.4/100), Kinetics (91.2/100), Standard reactions
- Math failure driven by: Infinite parameter space, definitional gaps, novel contexts

**NEW REQUIREMENT: Phase 2.5 - Subject Classification & Parameter Tuning**

Add after Phase 2 (Calibration Execution):

```markdown
### PHASE 2.5: SUBJECT-SPECIFIC PARAMETER OPTIMIZATION

#### A. Classify Subject Type

**REACTIVE/MECHANISTIC SUBJECTS** (Chemistry, Organic Chemistry):
- High standardization (limited reaction mechanisms)
- Predictable parameter space
- Strong identity coverage possible

**PARAMETRIC/INFINITE SUBJECTS** (Mathematics, Coordinate Geometry):
- Infinite parameter space (any numbers/coordinates)
- Low identity coverage
- Requires different strategy

**HYBRID SUBJECTS** (Physics, Biology):
- Mix of standard formulas + novel contexts
- Medium identity coverage

#### B. Adjust Calibration Targets by Type

| Subject Type | IDS Target | Identity Bank Size | Rigor Velocity | Novelty Factor |
|--------------|-----------|-------------------|----------------|----------------|
| **Reactive/Mechanistic** | 0.92-0.95 | 150-200 identities | HIGH | LOW |
| **Hybrid** | 0.85-0.90 | 120-150 identities | MEDIUM | MEDIUM |
| **Parametric/Infinite** | 0.75-0.80 | 200-300 identities | LOW | HIGH |

**Rationale:**
- Chemistry hit 65% with ~120 identities → increase to 150-200 for NEET
- Math hit 13% with ~120 identities → increase to 200-300 AND focus on definitional coverage
- Accept lower IDS for Math (0.75-0.80) but compensate with volume

#### C. Special Handling for Definitional Questions

**KCET Math Failure Pattern:** Missed basic definitions (Q5, Q6, Q7, Q58)

**NEW STEP:** Extract definitional questions from historical papers:
```bash
# Add to calibration script
extract_definitions() {
    # Identify pure definition questions (no calculation)
    grep -E "definition|define|which of the following is" historical_papers/*.txt

    # Create dedicated definition identity bank
    # Target: 30-40 definition identities per subject
}
```

**Definition Coverage Target:** 40-50% of definitional questions should be Tier 1+2
```

---

### 2. PHASE 3 ENHANCEMENT: Question Type Validation

**Current Limitation:** Question type analysis happens post-generation without quality gates.

**KCET Evidence:** Biology Q6 overscored (88 vs actual 70-75) due to semantic similarity masking different problem types.

**NEW REQUIREMENT: Phase 3.5 - Automated Quality Gates**

Add after Phase 3 (Question Type Analysis):

```markdown
### PHASE 3.5: AUTOMATED QUALITY VALIDATION

#### A. Tier Distribution Sanity Checks

**Implement automated verification:**
```typescript
interface TierDistributionLimits {
  subject: string;
  tier1_min: number;  // % minimum
  tier1_max: number;  // % maximum
  tier2_min: number;
  tier2_max: number;
  avgScore_min: number;
  avgScore_max: number;
}

const SANITY_LIMITS: TierDistributionLimits[] = [
  {
    subject: "Chemistry",
    tier1_min: 0,
    tier1_max: 5,    // Max 5% exact hits
    tier2_min: 50,   // Min 50% model matches (from KCET success)
    tier2_max: 75,   // Max 75% model matches
    avgScore_min: 75,
    avgScore_max: 90
  },
  {
    subject: "Physics",
    tier1_min: 0,
    tier1_max: 3,
    tier2_min: 40,
    tier2_max: 65,
    avgScore_min: 70,
    avgScore_max: 85
  },
  {
    subject: "Biology",
    tier1_min: 0,
    tier1_max: 3,
    tier2_min: 20,   // Lower target based on KCET
    tier2_max: 40,
    avgScore_min: 55,
    avgScore_max: 70
  },
  {
    subject: "Mathematics",
    tier1_min: 0,
    tier1_max: 2,
    tier2_min: 10,   // Accept lower target for Math
    tier2_max: 25,
    avgScore_min: 50,
    avgScore_max: 65
  }
];

function validateTierDistribution(forensicReport: ForensicReport): ValidationResult {
  const limits = SANITY_LIMITS.find(l => l.subject === forensicReport.subject);

  const tier1Pct = (forensicReport.tier1Count / forensicReport.totalQuestions) * 100;
  const tier2Pct = (forensicReport.tier2Count / forensicReport.totalQuestions) * 100;

  const errors = [];

  if (tier1Pct < limits.tier1_min || tier1Pct > limits.tier1_max) {
    errors.push(`Tier 1 ${tier1Pct.toFixed(1)}% outside range ${limits.tier1_min}-${limits.tier1_max}%`);
  }

  if (tier2Pct < limits.tier2_min || tier2Pct > limits.tier2_max) {
    errors.push(`Tier 2 ${tier2Pct.toFixed(1)}% outside range ${limits.tier2_min}-${limits.tier2_max}%`);
  }

  if (forensicReport.avgScore < limits.avgScore_min || forensicReport.avgScore > limits.avgScore_max) {
    errors.push(`Avg score ${forensicReport.avgScore} outside range ${limits.avgScore_min}-${limits.avgScore_max}`);
  }

  return { valid: errors.length === 0, errors };
}
```

**Action on Failure:** If validation fails, trigger recalibration with adjusted parameters.

#### B. Cross-Table Consistency Check

**KCET Lesson:** Biology/Chemistry reports had 15-point discrepancies between forensic table and executive summary.

**NEW AUTOMATED CHECK:**
```typescript
function verifyStatisticalConsistency(reportPath: string): ConsistencyReport {
  // 1. Parse forensic table, count actual tiers
  const tableStats = parseForensicTable(reportPath);

  // 2. Parse executive summary claims
  const summaryStats = parseExecutiveSummary(reportPath);

  // 3. Compare
  const discrepancies = [];

  if (Math.abs(tableStats.avgScore - summaryStats.avgScore) > 2) {
    discrepancies.push(`Avg score mismatch: Table=${tableStats.avgScore}, Summary=${summaryStats.avgScore}`);
  }

  for (let tier = 1; tier <= 5; tier++) {
    if (tableStats[`tier${tier}Count`] !== summaryStats[`tier${tier}Count`]) {
      discrepancies.push(`Tier ${tier} count mismatch: Table=${tableStats[`tier${tier}Count`]}, Summary=${summaryStats[`tier${tier}Count`]}`);
    }
  }

  return { consistent: discrepancies.length === 0, discrepancies };
}
```

**Run Before Deployment:** Prevent shipping reports with calculation errors.
```

---

### 3. PHASE 7 ENHANCEMENT: Forensic-Grade Quality Verification

**Current Limitation:** Phase 7 quality verification lacks forensic rigor.

**KCET Evidence:** Verification agents caught catastrophic errors that manual review missed.

**NEW REQUIREMENT: Phase 7.5 - Independent Agent Verification**

Add after Phase 7 (Quality Verification):

```markdown
### PHASE 7.5: INDEPENDENT FORENSIC VERIFICATION

#### A. Deploy Verification Agents

**For EACH subject, launch independent verification agent:**
```bash
claude-code task \
  --subagent-type general-purpose \
  --description "Verify Chemistry forensic report" \
  --prompt "Read forensic report at /path/to/chemistry_report.md.
            COUNT actual tier distribution from forensic table (lines 50-300).
            CALCULATE average score from all match scores.
            COMPARE against executive summary claims.
            REPORT any discrepancies > 5%."
```

**Agent Checklist:**
1. Count Tier 1 questions from table
2. Count Tier 2 questions from table
3. Count Tier 3 questions from table
4. Count Tier 4 questions from table
5. Count Tier 5 questions from table
6. Sum all match scores, divide by total questions
7. Compare against executive summary
8. Flag discrepancies > 2 points or > 1 question

**Acceptance Criteria:** All 4 subjects must pass independent verification before deployment.

#### B. Borderline Case Review

**KCET Lesson:** Math Q53 and Q14 were borderline cases that needed manual review.

**NEW STEP:** Extract all borderline questions for human review:
```sql
-- Find borderline Tier 2/3 cases (scores 75-79)
SELECT question_id, match_score, predicted_question, reasoning
FROM forensic_matches
WHERE match_score BETWEEN 75 AND 79
ORDER BY match_score DESC;

-- Find borderline Tier 3/4 cases (scores 55-64)
SELECT question_id, match_score, predicted_question, reasoning
FROM forensic_matches
WHERE match_score BETWEEN 55 AND 64
ORDER BY match_score DESC;
```

**Manual Review Required:** Expert reviews borderline cases, can upgrade/downgrade based on:
- Identical solving methodology (upgrade)
- Different problem types despite similar topic (downgrade)
- Parameter-only differences (upgrade to Tier 2)

#### C. Subject Ranking Verification

**Final Sanity Check:** Verify subject rankings make pedagogical sense.

**Expected NEET Rankings** (based on standardization):
1. Chemistry should rank #1 or #2 (high standardization)
2. Physics should rank #1 or #2 (formula-based)
3. Biology should rank #3 (medium standardization)
4. Math (if included) should rank #4 (infinite parameters)

**Action if Anomaly:** If Biology outperforms Chemistry/Physics, investigate for scoring errors.
```

---

### 4. NEW PHASE 10: POST-DEPLOYMENT FORENSIC AUDIT & FEEDBACK LOOP

**Critical Missing Component:** Current workflow ends at deployment with no post-exam validation.

**KCET Value:** Forensic audit revealed precise success/failure patterns invisible during generation.

```markdown
## PHASE 10: POST-EXAM FORENSIC AUDIT (NEW)

**Timing:** Within 72 hours of real NEET exam

**Objective:** Systematic comparison of real exam vs predictions to feed next cycle

### Step 10.1: Acquire Real Exam Papers

```bash
# Download official NEET exam (all sets)
mkdir -p real_exams/NEET_2027/
curl -o real_exams/NEET_2027/physics_setA.pdf [SOURCE]
curl -o real_exams/NEET_2027/physics_setB.pdf [SOURCE]
# Repeat for Chemistry, Biology
```

### Step 10.2: Execute Forensic Comparison

**Use same methodology as KCET audit:**
```bash
# Generate forensic comparison matrix
# Real questions × Predicted questions = similarity scores

for subject in Physics Chemistry Biology; do
  python forensic_matcher.py \
    --real "real_exams/NEET_2027/${subject}_setA.pdf" \
    --predicted "generated/NEET_2027/${subject}_flagship_120q.json" \
    --output "audit/${subject}_forensic_report.md" \
    --scoring-rubric tier_system.yaml
done
```

### Step 10.3: Extract Performance Patterns

**Automated Analysis:**
```sql
-- Which identities performed well?
SELECT identity_id, identity_name, AVG(match_score) as avg_performance
FROM forensic_matches
JOIN predicted_questions ON forensic_matches.predicted_id = predicted_questions.id
GROUP BY identity_id
HAVING AVG(match_score) >= 80
ORDER BY avg_performance DESC
LIMIT 20;

-- Which identities failed?
SELECT identity_id, identity_name, AVG(match_score) as avg_performance
FROM forensic_matches
JOIN predicted_questions ON forensic_matches.predicted_id = predicted_questions.id
GROUP BY identity_id
HAVING AVG(match_score) < 40
ORDER BY avg_performance ASC
LIMIT 20;

-- Which question types were missed?
SELECT question_type, COUNT(*) as missed_count
FROM real_questions
LEFT JOIN forensic_matches ON real_questions.id = forensic_matches.real_id
WHERE forensic_matches.match_score < 30
GROUP BY question_type
ORDER BY missed_count DESC;
```

### Step 10.4: Update Identity Bank

**Feedback Loop:**
```typescript
interface IdentityPerformance {
  identityId: string;
  avgScore: number;
  hitCount: number;
  retention: 'KEEP' | 'MODIFY' | 'REMOVE';
}

function updateIdentityBank(auditResults: AuditResult[]): void {
  const performances = calculateIdentityPerformances(auditResults);

  for (const identity of performances) {
    if (identity.avgScore >= 80 && identity.hitCount >= 2) {
      // High-performing identity - KEEP and potentially replicate
      markIdentity(identity.identityId, 'PRIORITY_KEEP');

    } else if (identity.avgScore < 40 && identity.hitCount === 0) {
      // Low-performing identity - REMOVE or MAJOR REVISION
      markIdentity(identity.identityId, 'REMOVE');

    } else if (identity.avgScore >= 60 && identity.avgScore < 80) {
      // Medium performer - MODIFY to improve
      markIdentity(identity.identityId, 'REVISE');
    }
  }

  // Generate next cycle identity bank
  generateNextCycleBank({
    keepIdentities: performances.filter(p => p.retention === 'KEEP'),
    reviseIdentities: performances.filter(p => p.retention === 'MODIFY'),
    removeIdentities: performances.filter(p => p.retention === 'REMOVE')
  });
}
```

### Step 10.5: Document Learnings

**Create audit summary:**
```markdown
# NEET 2027 POST-EXAM AUDIT SUMMARY

## Overall Performance
- Physics: X.X/100 (Tier 1+2: X%)
- Chemistry: X.X/100 (Tier 1+2: X%)
- Biology: X.X/100 (Tier 1+2: X%)

## Top Performing Identities (Keep for Next Year)
1. [Identity Name] - Avg Score: X/100 - Hit Y questions
2. ...

## Failed Identities (Remove/Revise)
1. [Identity Name] - Avg Score: X/100 - Hit 0 questions
2. ...

## Gap Analysis (Missed Question Types)
1. [Question Type X] - Z questions missed
2. ...

## Recommendations for Next Calibration
- Increase identity count for [Subject] from X to Y
- Add definitional coverage for [Topic]
- Revise [Identity Name] to cover [Gap]
```

### Step 10.6: Archive and Version Control

```bash
# Tag this calibration cycle
git tag -a "NEET_2027_audit_complete" -m "Forensic audit results"

# Archive audit reports
mkdir -p archives/NEET_2027/
cp audit/*.md archives/NEET_2027/
cp generated/NEET_2027/*.json archives/NEET_2027/

# Commit learnings
git add archives/NEET_2027/
git commit -m "NEET 2027 post-exam audit: [Subject] X%, [Subject] Y%"
```
```

---

## SUBJECT-SPECIFIC CALIBRATION STRATEGIES FOR NEET

### Chemistry Calibration (Target: 60-70% Tier 1+2)

**KCET Success Factors:**
- Organic mechanisms highly standardized → replicate for NEET
- Kinetics reactions predictable → increase identity coverage
- Standard reactions (aldol, Friedel-Crafts, etc.) → maintain emphasis

**NEET-Specific Adjustments:**
```yaml
chemistry_calibration:
  identity_bank_size: 180  # Increase from 120 based on KCET success
  focus_areas:
    - organic_mechanisms: 40%  # KCET hit 85.4/100
    - kinetics_reactions: 25%  # KCET hit 91.2/100
    - standard_reactions: 20%
    - definitional_concepts: 15%

  iDS_target: 0.93  # High rigor for predictable subject

  special_emphasis:
    - Named reactions (30-35 identities)
    - Reaction mechanisms (35-40 identities)
    - Periodic trends (15-20 identities)
    - Industrial processes (10-15 identities)
```

### Physics Calibration (Target: 45-55% Tier 1+2)

**KCET Performance:** 51.7% Tier 1+2 - maintain approach

**NEET-Specific Adjustments:**
```yaml
physics_calibration:
  identity_bank_size: 150  # Maintain current size
  focus_areas:
    - formula_application: 35%  # Standard formulas
    - conceptual_problems: 30%  # Theory-based
    - numerical_variations: 25%  # Parameter changes
    - definitional_concepts: 10%

  iDS_target: 0.88

  special_emphasis:
    - Kinematics formulas (20-25 identities)
    - Electromagnetism standard problems (25-30 identities)
    - Optics ray diagrams (15-20 identities)
    - Modern physics definitional (10-15 identities)
```

### Biology Calibration (Target: 30-40% Tier 1+2)

**KCET Weakness:** Only 23.3% - needs major revision

**Root Cause Analysis from KCET:**
- Diagram-based questions missed (plant anatomy, cell diagrams)
- Genetic cross calculations underrepresented
- Ecosystem/ecology novel contexts not covered
- Taxonomic classifications gaps

**NEET-Specific Adjustments:**
```yaml
biology_calibration:
  identity_bank_size: 200  # INCREASE significantly from 120
  focus_areas:
    - genetic_crosses: 25%  # MAJOR GAP in KCET
    - plant_anatomy: 20%    # DIAGRAM-HEAVY for NEET
    - human_physiology: 20%
    - ecology_ecosystems: 15%
    - taxonomy: 10%
    - definitional_concepts: 10%

  iDS_target: 0.82  # Lower rigor, higher coverage

  special_emphasis:
    - Mendelian genetics ALL variations (25-30 identities)
    - Plant tissue diagrams (20-25 identities)
    - Human organ systems (20-25 identities)
    - Ecological relationships (15-20 identities)
    - Classification keys (10-15 identities)

  new_requirement:
    - Include diagram-based identity generation
    - Add cross-calculation templates
    - Create ecology scenario bank
```

---

## CRITICAL FIXES FOR KNOWN FAILURE PATTERNS

### Fix 1: Definitional Question Coverage (Math/Biology)

**KCET Failure:** Math missed Q5, Q6, Q7, Q58 (all definitional)

**Solution:**
```markdown
### NEW IDENTITY TYPE: DEFINITIONAL IDENTITIES

Create separate identity bank for pure definition questions:

**Template Structure:**
```json
{
  "identity_type": "DEFINITIONAL",
  "question_pattern": "What is the definition of [CONCEPT]?",
  "variations": [
    "Define [CONCEPT]",
    "Which of the following correctly defines [CONCEPT]?",
    "[CONCEPT] is defined as:",
    "The term [CONCEPT] refers to:"
  ],
  "answer_pattern": "Standard textbook definition",
  "topics": ["TOPIC_NAME"],
  "difficulty": "EASY",
  "expected_tier": "1 or 2"  // Should be exact or near-exact hits
}
```

**Coverage Target:** Generate 30-40 definitional identities per subject
**Validation:** If subject has <30% definitional coverage, flag as incomplete
```

### Fix 2: Parameter Space Explosion (Math/Coordinate Geometry)

**KCET Failure:** Math infinite parameter space (any coordinates, any numbers)

**Solution:**
```markdown
### STRATEGY: VOLUME OVER PRECISION FOR PARAMETRIC SUBJECTS

**For subjects with infinite parameters:**
- Generate 250-300 identities (vs 120-150 for standard subjects)
- Lower IDS target to 0.75-0.80 (accept more variation)
- Focus on METHOD coverage, not parameter matching

**Example: Coordinate Geometry**
Instead of:
- 10 identities for "distance between two points"

Generate:
- Distance formula: 30 identities (various point positions)
- Section formula: 25 identities (internal/external division)
- Midpoint formula: 20 identities
- Centroid formula: 15 identities
- Collinearity conditions: 20 identities

**Rationale:** Cast wider net to improve hit probability in infinite space
```

### Fix 3: Novel Context Recognition (Biology/Ecology)

**KCET Failure:** Biology Q15 (viral video context) - missed due to novel framing

**Solution:**
```markdown
### STRATEGY: CONTEXT-AGNOSTIC IDENTITY GENERATION

**For real-world application questions:**
- Train identity generator to recognize concept-context pairs
- Generate multiple contexts for same concept

**Example: Population Growth**
Standard identity: "Calculate population growth using exponential formula"

Enhanced identities (same concept, varied contexts):
1. "Viral video shares follow exponential growth..."
2. "Bacterial culture increases exponentially..."
3. "Invasive species population grows at rate..."
4. "Social media followers increase exponentially..."
5. "Radioactive decay follows exponential decrease..."

**Coverage:** 3-5 context variations per core concept
**Benefit:** Increase hit probability for novel real-world framings
```

---

## IMPLEMENTATION PRIORITY

### HIGH PRIORITY (Implement for Next NEET Cycle)

1. **Phase 2.5: Subject-Specific Parameters** ← CRITICAL
   - Chemistry: 180 identities, IDS 0.93
   - Biology: 200 identities, IDS 0.82 (major increase)
   - Physics: 150 identities, IDS 0.88

2. **Phase 10: Post-Exam Audit Loop** ← CRITICAL
   - Without this, no learning from real exam results
   - Creates compounding improvement cycle

3. **Definitional Identity Bank** ← HIGH IMPACT
   - 30-40 definitions per subject
   - Should boost all subjects by 5-10 percentage points

### MEDIUM PRIORITY (Implement Within 2 Cycles)

4. **Phase 3.5: Automated Quality Gates**
   - Tier distribution validation
   - Cross-table consistency checks

5. **Phase 7.5: Independent Verification**
   - Agent-based forensic verification
   - Borderline case review

### LOW PRIORITY (Nice to Have)

6. **Context-Agnostic Generation** (Biology/Physics)
   - Multiple contexts per concept
   - Requires AI training data

7. **Diagram-Based Identity Generation** (Biology)
   - Requires OCR/image processing
   - High complexity, medium ROI

---

## EXPECTED IMPACT ON NEET PREDICTIONS

**Conservative Estimates** (based on KCET patterns):

| Subject | Current (KCET) | With Improvements | Target NEET |
|---------|---------------|-------------------|-------------|
| **Chemistry** | 65.0% T1+2 | **70-75% T1+2** | A/A- (85-90/100) |
| **Physics** | 51.7% T1+2 | **55-60% T1+2** | B+/A- (78-85/100) |
| **Biology** | 23.3% T1+2 | **35-45% T1+2** | C+/B- (65-75/100) |

**Overall NEET Target:**
- Tier 1+2 Success: 50-55% (vs KCET 38.3%)
- Average Score: 75-80/100 (vs KCET 66.4/100)
- Grade: B+ to A- (vs KCET B-)

**Key Drivers:**
1. Subject-specific calibration (+8-12 points per subject)
2. Definitional coverage (+5-8 points per subject)
3. Increased Biology identity bank (+12-15 points for Biology)
4. Post-audit feedback loop (compounding 3-5% improvement per cycle)

---

## VALIDATION METRICS

**Track these metrics to confirm improvements:**

```typescript
interface CalibrationMetrics {
  // Pre-generation metrics
  identityBankSize: number;
  definitionalCoverage: number;  // % of definitions covered
  parameterDiversity: number;    // For Math/parametric subjects

  // Post-generation metrics
  tier1_2_percentage: number;    // Target: Chemistry 70%, Physics 55%, Biology 40%
  avgMatchScore: number;         // Target: Chemistry 85, Physics 78, Biology 68

  // Post-audit metrics (after real exam)
  actualTier1_2: number;         // Real performance
  identityHitRate: number;       // % of identities that matched ≥1 question
  gapAnalysis: string[];         // Missed question types
}

function validateCalibrationSuccess(metrics: CalibrationMetrics): boolean {
  const thresholds = {
    Chemistry: { tier1_2_min: 65, avgScore_min: 80 },
    Physics: { tier1_2_min: 50, avgScore_min: 75 },
    Biology: { tier1_2_min: 35, avgScore_min: 65 }
  };

  // Validation logic
  return metrics.tier1_2_percentage >= thresholds[subject].tier1_2_min
      && metrics.avgMatchScore >= thresholds[subject].avgScore_min;
}
```

---

## CONCLUSION

KCET forensic audit revealed systematic weaknesses in current calibration workflow:

**ROOT CAUSES:**
1. One-size-fits-all calibration (doesn't account for subject differences)
2. No post-exam validation (no learning loop)
3. Insufficient definitional coverage (especially Math/Biology)
4. Inadequate identity bank size for parametric subjects (Math)
5. Missing quality gates (allowed 15-point statistical errors)

**SOLUTION:**
- Subject-specific calibration (Phase 2.5)
- Post-exam audit loop (Phase 10)
- Definitional identity bank (30-40 per subject)
- Automated quality gates (Phase 3.5, 7.5)
- Increased Biology identity coverage (120→200)

**EXPECTED OUTCOME:**
NEET predictions should achieve 50-55% Tier 1+2 success (vs KCET 38.3%), with Chemistry leading at 70-75%, Physics at 55-60%, and Biology improved to 35-45%.

**NEXT STEPS:**
1. Update REPEATABLE_CALIBRATION_WORKFLOW.md with Phase 2.5 and Phase 10
2. Create subject-specific calibration config files
3. Build definitional identity extraction scripts
4. Implement automated quality gate validators
5. Document Phase 10 audit procedures for post-NEET execution

---

**Document Status:** READY FOR IMPLEMENTATION
**Confidence Level:** HIGH (based on empirical KCET data)
**Risk Level:** LOW (improvements are additive, not destructive)
