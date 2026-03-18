# Topic/Chapter/Domain Consistency Verification Report

**Generated:** 2026-02-13
**Database:** edujourney-universal-teacher-studio (Supabase)
**Scope:** 89 scans with analysis_data, 54 official topics

---

## Executive Summary

### Critical Findings

1. **MAJOR INCONSISTENCY**: 323 out of 349 unique topic names in scans do NOT match the official topics table
2. **Domain Inconsistency**: 81 topics are assigned to multiple different domains (creating confusion)
3. **Case Variations**: 8 normalized topics have case/capitalization variations
4. **Missing Official Topics**: 28 official topics in the topics table have NO questions in scans
5. **Limited Visual Sketches**: Only 15 sketches across 8 topics (need more for Learn tab)

---

## 1. Topic Name Variations (Case Sensitivity Issues)

The following topics appear with different capitalization in the database:

### Issue #1: "de Broglie Wavelength"
- `"de Broglie Wavelength"` (17 questions) - MODERN PHYSICS
- `"De Broglie Wavelength"` (2 questions) - MODERN PHYSICS
- **Impact:** Questions split across two topic names
- **Recommendation:** Standardize to "de Broglie Wavelength"

### Issue #2: "Matrices"
- `"Matrices"` (168 questions) - MATHEMATICS, ALGEBRA
- `"MATRICES"` (1 question) - ALGEBRA
- **Impact:** Official topic "Matrices" split
- **Recommendation:** Standardize to "Matrices"

### Issue #3: "Linear Programming"
- `"Linear Programming"` (49 questions) - MATHEMATICS, LINEAR PROGRAMMING, ELECTRODYNAMICS
- `"LINEAR PROGRAMMING"` (1 question) - LINEAR PROGRAMMING
- **Impact:** Official topic split
- **Recommendation:** Standardize to "Linear Programming"

### Issue #4-8: Similar Issues
- "Sequences and Series" vs "SEQUENCES AND SERIES" (41 vs 1)
- "Functions" vs "FUNCTIONS" (30 vs 1)
- "Differential Calculus" vs "DIFFERENTIAL CALCULUS" (18 vs 9)
- "Integration" vs "INTEGRATION" (48 vs 8)
- "Resonance in LCR Circuit" vs "Resonance in LCR circuit" (1 vs 1)

---

## 2. Domain/Chapter Grouping Inconsistencies

**Total Topics with Multiple Domains:** 81

### Critical Domain Conflicts

#### Math Topics with Inconsistent Domains

| Topic | Current Domains | Correct Domain |
|-------|----------------|----------------|
| Inverse Trigonometric Functions | MATHEMATICS, CALCULUS, ALGEBRA, none | **Trigonometry** |
| Matrices | MATHEMATICS, ALGEBRA | **Algebra** |
| Determinants | MATHEMATICS, ALGEBRA | **Algebra** |
| Differential Equations | MATHEMATICS, CALCULUS, ELECTRODYNAMICS | **Calculus** |
| Vectors | VECTORS & 3D GEOMETRY, ALGEBRA, VECTORS & 3D GE, ELECTRODYNAMICS | **Vector Algebra** |
| Three Dimensional Geometry | VECTORS & 3D GEOMETRY, ELECTRODYNAMICS | **Coordinate Geometry** |
| Linear Programming | MATHEMATICS, LINEAR PROGRAMMING, ELECTRODYNAMICS | **Optimization** |
| Probability | PROBABILITY, ELECTRODYNAMICS | **Statistics and Probability** |

#### Physics Topics with Inconsistent Domains

| Topic | Current Domains | Correct Domain |
|-------|----------------|----------------|
| Current Electricity | ALGEBRA, ELECTRODYNAMICS, ELECTROMAGNETISM | **Current Electricity** |
| Semiconductor Electronics | ALGEBRA, ELECTRODYNAMICS, MODERN PHYSICS, ELECTROMAGNETISM | **Electronics** |
| Electromagnetic Waves | ELECTRODYNAMICS, ELECTROMAGNETISM | **Electromagnetism** |
| Alternating Current | ELECTROMAGNETISM, ELECTRODYNAMICS | **Electromagnetism** |
| Moving Charges and Magnetism | ELECTRODYNAMICS, ELECTROMAGNETISM | **Magnetism** |

#### Cross-Domain Contamination

Some topics appear in domains they shouldn't be in at all:

- **"ELECTRODYNAMICS" contains Math topics:** Differential Equations, Linear Programming, Complex Numbers, Permutations and Combinations, Sets, Straight Lines, Statistics, Vectors, Probability, Functions, Trigonometry, Three Dimensional Geometry
- **"ALGEBRA" contains Physics topics:** Current Electricity, Electrostatics, Magnetism, Units and Measurements, Semiconductor Electronics

---

## 3. Official Topics vs Scan Topics Mismatch

### Topics in Scans but NOT in Official Topics Table (323 topics)

Sample of problematic topics:

**Generic/Vague Topics (should be mapped to official):**
- "Physics" (726 questions) - NO DOMAIN ASSIGNED
- "General" (344 questions) - NO DOMAIN ASSIGNED
- "Mathematics" (173 questions) - ALGEBRA domain

**Unofficial/Informal Names (need mapping):**
- "3D Geometry" → Should map to "Three Dimensional Geometry"
- "Application of Derivatives" → Should be "Applications of Derivatives"
- "Electrostatics" → Should map to "Electric Charges and Fields"
- "Capacitors" → Should map to "Electrostatic Potential and Capacitance"
- "Optics" → Should map to "Ray Optics and Optical Instruments" or "Wave Optics"
- "Magnetism" → Should map to "Moving Charges and Magnetism" or "Magnetism and Matter"

**Too Granular Topics (should be consolidated):**
- "AC Circuits", "AC Voltage", "Alternating Current Circuits" → All should be "Alternating Current"
- "Electric Dipole", "Electric Dipole Moment", "Electric Dipole Potential" → Part of "Electrostatic Potential and Capacitance"
- "Derivatives", "Derivatives of Parametric Functions", "Derivatives of Trigonometric Functions" → Should be consolidated under "Continuity and Differentiability"

### Official Topics NOT Found in Any Scans (28 topics)

**Chemistry (all 14 Chemistry topics are missing):**
- Alcohols Phenols and Ethers
- Aldehydes Ketones and Carboxylic Acids
- Amines
- Biomolecules
- Chemical Kinetics
- Chemistry in Everyday Life
- Coordination Compounds
- d and f Block Elements
- Electrochemistry
- General Principles and Processes of Isolation of Elements
- Haloalkanes and Haloarenes
- p-Block Elements
- Solutions
- Surface Chemistry

**Biology (all 13 Biology topics are missing):**
- Biodiversity and Conservation
- Biotechnology and its Applications
- Biotechnology Principles and Processes
- Ecosystem
- Evolution
- Human Health and Disease
- Human Reproduction
- Molecular Basis of Inheritance
- Organisms and Populations
- Principles of Inheritance and Variation
- Reproductive Health
- Sexual Reproduction in Flowering Plants
- Strategies for Enhancement in Food Production

**Physics (1 missing):**
- Electric Charges and Fields (exists as "Electrostatics" in scans)

---

## 4. Visual Sketches Analysis

### Summary Statistics
- **Total Sketches:** 15
- **Unique Topics with Sketches:** 8
- **Coverage:** Very limited for Learn tab functionality

### Sketches by Topic

| Topic | Count | Domain | Notes |
|-------|-------|--------|-------|
| Mathematics | 8 | ALGEBRA | Generic topic, not official |
| Alternating Current | 1 | ELECTROMAGNETISM | Official topic ✓ |
| Circular Motion | 1 | MECHANICS | Not in official topics |
| Semiconductor Electronics | 1 | ELECTRODYNAMICS | Official topic ✓ |
| General | 1 | Unknown | Generic topic, problematic |
| Electromagnetic Waves | 1 | ELECTRODYNAMICS | Official topic ✓ |
| Capacitor Combinations | 1 | ELECTRODYNAMICS | Should map to "Electrostatic Potential and Capacitance" |
| Gauss's Law | 1 | ELECTRODYNAMICS | Should map to "Electric Charges and Fields" |

### Issues with Visual Sketches
1. **No questionText field:** All sketches show "No text available"
2. **No exam_context.subject:** All show "Unknown" for subject
3. **Generic topics:** "Mathematics" and "General" should map to specific official topics
4. **Limited coverage:** Only 15 sketches total, need many more for effective Learn tab

---

## 5. Domain Hierarchy Issues

### Current Domain Structure (from scans)

The following domains are used inconsistently:

1. **ALGEBRA** - 28 topics (but contains physics topics!)
2. **CALCULUS** - 43 topics
3. **ELECTRODYNAMICS** - 116 topics (too broad, contains math topics)
4. **ELECTROMAGNETISM** - 43 topics (overlaps with ELECTRODYNAMICS)
5. **LINEAR PROGRAMMING** - 3 topics
6. **MATHEMATICS** - 47 topics (overlaps with ALGEBRA, CALCULUS)
7. **MECHANICS** - 82 topics
8. **MODERN PHYSICS** - 29 topics
9. **OPTICS** - 29 topics
10. **OSCILLATIONS & WAVES** - 11 topics
11. **PROBABILITY** - 6 topics
12. **THERMODYNAMICS** - 8 topics
13. **VECTORS & 3D GEOMETRY** - 1 topic ("Vectors")
14. **VECTORS & 3D GE** - 1 topic ("Vectors") - Duplicate!
15. **Unreadable** - 1 topic

### Official Domain Structure (from topics table)

Based on the `topics` table, domains should be:

**Physics Domains:**
- Electrostatics
- Current Electricity
- Magnetism
- Electromagnetism
- Optics
- Modern Physics
- Electronics

**Math Domains:**
- Algebra
- Trigonometry
- Calculus
- Coordinate Geometry
- Vector Algebra
- Optimization
- Statistics and Probability

**Chemistry Domains:**
- Physical Chemistry
- Inorganic Chemistry
- Organic Chemistry
- Applied Chemistry

**Biology Domains:**
- Genetics
- Biotechnology
- Ecology
- Human Physiology
- Plant Reproduction
- Evolution
- Food Production

---

## 6. Recommendations & Action Items

### Immediate Actions (High Priority)

1. **Fix Topic Name Case Sensitivity**
   - Normalize all topic names to match official topics table exactly
   - Update scan analysis_data JSONB to use correct capitalization
   - SQL: `UPDATE scans SET analysis_data = <normalized_json>`

2. **Map Unofficial Topics to Official Topics**
   - Use the `TOPIC_MAPPING_HINTS` in `/utils/officialTopics.ts`
   - Apply `matchToOfficialTopic()` function to all scan questions
   - Consolidate "Physics", "General", "Mathematics" into specific topics

3. **Fix Domain Assignments**
   - Remove cross-domain contamination (Math topics in ELECTRODYNAMICS, Physics topics in ALGEBRA)
   - Standardize domain names to match topics table structure
   - Remove duplicate "VECTORS & 3D GE" domain

4. **Enhance Visual Sketches**
   - Add `questionText` field to questions with sketches
   - Populate `exam_context.subject` properly
   - Map sketch topics to official topics
   - Generate more sketches for key topics (target: 50+ topics with sketches)

### Medium Priority

5. **Update Extraction Prompts**
   - Ensure `/utils/cleanMathExtractor.ts` and `/utils/cleanPhysicsExtractor.ts` use official topics
   - Add validation: reject non-official topic names
   - Enhance domain assignment logic

6. **Populate Missing Topics**
   - Add Chemistry questions to database
   - Add Biology questions to database
   - Verify all Class 12 topics are covered

7. **Create Topic Mapping Migration**
   - Write script to migrate all existing scans to official topics
   - Create backup before migration
   - Test on subset first

### Long-term Improvements

8. **Add Database Constraints**
   - Create ENUM type for official topics
   - Add CHECK constraint on analysis_data.questions.topic
   - Prevent future inconsistencies at database level

9. **Build Topic Validation API**
   - API endpoint to validate topic names before saving
   - Auto-suggest official topic based on user input
   - Real-time topic mapping during scan upload

10. **Create Topic Analytics Dashboard**
    - Show topic distribution across scans
    - Identify under-represented topics
    - Track sketch coverage per topic

---

## 7. Data Quality Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Total Scans with Questions | 89 | ✓ |
| Unique Topics in Scans | 349 | ⚠️ Too many |
| Official Topics | 54 | ✓ |
| Topics Matching Official | 26 | ❌ Only 7.5% |
| Topics NOT Matching Official | 323 | ❌ 92.5% |
| Topics with Case Variations | 8 | ⚠️ Needs fix |
| Topics with Multiple Domains | 81 | ❌ Inconsistent |
| Official Topics with Questions | 26 | ⚠️ 48% |
| Official Topics WITHOUT Questions | 28 | ⚠️ 52% |
| Visual Sketches | 15 | ❌ Insufficient |
| Topics with Sketches | 8 | ❌ Insufficient |

---

## 8. Example Queries for Fixes

### Query 1: Normalize Topic Case Sensitivity

```sql
-- Example: Fix "MATRICES" → "Matrices"
UPDATE scans
SET analysis_data = jsonb_set(
  analysis_data,
  '{questions}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN q->>'topic' = 'MATRICES'
        THEN jsonb_set(q, '{topic}', '"Matrices"')
        ELSE q
      END
    )
    FROM jsonb_array_elements(analysis_data->'questions') AS q
  )
)
WHERE analysis_data @> '{"questions": [{"topic": "MATRICES"}]}';
```

### Query 2: Map Informal Topics to Official

```sql
-- Example: Map "Electrostatics" → "Electric Charges and Fields"
UPDATE scans
SET analysis_data = jsonb_set(
  analysis_data,
  '{questions}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN q->>'topic' = 'Electrostatics'
        THEN jsonb_set(q, '{topic}', '"Electric Charges and Fields"')
        ELSE q
      END
    )
    FROM jsonb_array_elements(analysis_data->'questions') AS q
  )
)
WHERE analysis_data @> '{"questions": [{"topic": "Electrostatics"}]}';
```

### Query 3: Fix Domain Assignments

```sql
-- Example: Fix "Differential Equations" domain to CALCULUS
UPDATE scans
SET analysis_data = jsonb_set(
  analysis_data,
  '{questions}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN q->>'topic' = 'Differential Equations' AND q->>'domain' = 'ELECTRODYNAMICS'
        THEN jsonb_set(q, '{domain}', '"CALCULUS"')
        ELSE q
      END
    )
    FROM jsonb_array_elements(analysis_data->'questions') AS q
  )
)
WHERE analysis_data @> '{"questions": [{"topic": "Differential Equations"}]}';
```

---

## 9. Topic Mapping Reference

### Official Math Topics (Class 12)

From `/utils/officialTopics.ts`:

1. Relations and Functions → Domain: Algebra
2. Inverse Trigonometric Functions → Domain: Trigonometry
3. Matrices → Domain: Algebra
4. Determinants → Domain: Algebra
5. Continuity and Differentiability → Domain: Calculus
6. Applications of Derivatives → Domain: Calculus
7. Integrals → Domain: Calculus
8. Applications of Integrals → Domain: Calculus
9. Differential Equations → Domain: Calculus
10. Vectors → Domain: Vector Algebra
11. Three Dimensional Geometry → Domain: Coordinate Geometry
12. Linear Programming → Domain: Optimization
13. Probability → Domain: Statistics and Probability

### Official Physics Topics (Class 12)

1. Electric Charges and Fields → Domain: Electrostatics
2. Electrostatic Potential and Capacitance → Domain: Electrostatics
3. Current Electricity → Domain: Current Electricity
4. Moving Charges and Magnetism → Domain: Magnetism
5. Magnetism and Matter → Domain: Magnetism
6. Electromagnetic Induction → Domain: Electromagnetism
7. Alternating Current → Domain: Electromagnetism
8. Electromagnetic Waves → Domain: Electromagnetism
9. Ray Optics and Optical Instruments → Domain: Optics
10. Wave Optics → Domain: Optics
11. Dual Nature of Radiation and Matter → Domain: Modern Physics
12. Atoms → Domain: Modern Physics
13. Nuclei → Domain: Modern Physics
14. Semiconductor Electronics → Domain: Electronics

---

## 10. Next Steps

### Week 1: Critical Fixes
- [ ] Write migration script to normalize topic names
- [ ] Apply topic mapping for top 50 most common informal topics
- [ ] Fix domain assignments for official topics
- [ ] Test on 10 scans first, then apply to all

### Week 2: Enhancement
- [ ] Update extraction prompts to use official topics only
- [ ] Add validation at API level
- [ ] Populate missing Chemistry/Biology topics
- [ ] Increase visual sketches to 50+ topics

### Week 3: Validation
- [ ] Re-run this analysis script
- [ ] Verify all scans use official topics
- [ ] Check Learn tab displays correctly
- [ ] User acceptance testing

---

## Appendix A: Top 20 Most Common Topics (with issues)

1. **Physics** (726) - ❌ Generic, needs mapping
2. **General** (344) - ❌ Generic, needs mapping
3. **Mathematics** (173) - ⚠️ Generic, but in ALGEBRA domain
4. **Matrices** (168) - ✓ Official (but has case variant)
5. **Relations and Functions** (165) - ✓ Official
6. **Differential Equations** (142) - ✓ Official (but in wrong domains)
7. **Probability** (139) - ✓ Official (but in wrong domains)
8. **Vectors** (126) - ✓ Official (but in wrong domains)
9. **Three Dimensional Geometry** (121) - ✓ Official (but in wrong domains)
10. **Inverse Trigonometric Functions** (111) - ✓ Official (but in wrong domains)
11. **Determinants** (66) - ✓ Official
12. **Applications of Derivatives** (65) - ✓ Official
13. **Definite Integrals** (54) - ⚠️ Should be "Integrals"
14. **Linear Programming** (49) - ✓ Official (but in wrong domains)
15. **Integration** (48) - ⚠️ Should be "Integrals"
16. **Current Electricity** (45) - ✓ Official (but in wrong domains)
17. **Trigonometry** (43) - ⚠️ Too broad, map to specific topics
18. **Sequences and Series** (41) - ⚠️ Not in official Class 12 topics
19. **Continuity and Differentiability** (40) - ✓ Official
20. **Integrals** (38) - ✓ Official

---

**Report End**
