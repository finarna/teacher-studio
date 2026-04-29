# NEET SET A/B Strategic Differentiation Strategy

**Document Version:** 1.0
**Date:** 2026-04-29
**Applies to:** NEET 2026 Prediction (Physics, Chemistry, Botany, Zoology)
**Strategy:** Approach 3 - Hybrid (Maintain Signature, Vary Emphasis)

---

## Overview

The NEET flagship generator creates **two strategically differentiated question sets** (SET A and SET B) while maintaining calibration exactness for forensic audit accuracy.

### Core Principle

**Both sets predict the same NEET 2026 exam**, but emphasize different pedagogical approaches:
- **SET A:** Formula/Numerical emphasis - strengthens quantitative problem-solving
- **SET B:** Conceptual/Qualitative emphasis - deepens understanding and real-world connections

---

## Calibration Integrity (Phase 4 Alignment)

### Maintained Constants (Both Sets)

| Parameter | SET A | SET B | Source |
|-----------|-------|-------|--------|
| **IDS Target** | 0.894 | 0.894 | Phase 4 Calibration |
| **Rigor Velocity** | 1.68 | 1.68 | Phase 4 Calibration |
| **Difficulty Mix** | 20/71/9 | 20/71/9 | Phase 4 Calibration |
| **Board Signature** | DIAGRAM_FORMULA_MCQ | DIAGRAM_FORMULA_MCQ | Phase 4 Calibration |
| **Question Types** | 78/12/4/3/2 | 78/12/4/3/2 | Phase 2 Analysis |
| **Question Count** | 45 | 45 | NEET 2026 Format |

✅ **Result:** Both sets are forensically valid predictions of NEET 2026 actual paper

---

## Strategic Differentiation (Directive-Based)

### SET A: Formula/Numerical Emphasis

**Focus:** ⚡ Quantitative Reasoning & Formula Application

**AI Directives:**
- Prioritize questions requiring formula manipulation
- Emphasize quantitative problem-solving
- Include multi-step calculations where applicable
- Focus on numerical accuracy and precision
- Derive relationships using mathematical expressions
- Apply formulas to solve real-world numerical problems
- Test mathematical reasoning and computational skills

**Student Benefit:**
- Strengthens calculation speed and accuracy
- Builds formula recall and application skills
- Develops numerical reasoning under time pressure
- Prepares for formula-heavy questions in actual exam

**Example Question Types:**
- Numerical calculation using multiple formulas
- Deriving unknown values from given equations
- Unit conversion and dimensional analysis
- Graph-based numerical interpretation
- Multi-step physics problems

---

### SET B: Conceptual/Qualitative Emphasis

**Focus:** 🧠 Conceptual Clarity & Qualitative Reasoning

**AI Directives:**
- Prioritize questions testing deep conceptual understanding
- Emphasize qualitative reasoning and logical deduction
- Include real-world applications and practical contexts
- Focus on principle-based problem solving
- Test cause-and-effect relationships
- Analyze phenomena using fundamental concepts
- Develop intuitive understanding over rote calculation

**Student Benefit:**
- Deepens understanding of fundamental principles
- Builds intuitive reasoning skills
- Connects physics to real-world scenarios
- Prepares for conceptual/assertion-reason questions in actual exam

**Example Question Types:**
- Conceptual analysis without calculation
- Real-world application scenarios
- Cause-and-effect reasoning
- Assertion-Reason MCQs
- Qualitative comparison questions
- Principle-based logical deduction

---

## Implementation Mechanism

### How Differentiation Works

The generator uses **directive-based AI guidance** while keeping all calibrated parameters constant:

```typescript
// Both sets use SAME calibration
const calibration = {
  idsTarget: 0.894,           // Same
  rigorVelocity: 1.68,        // Same
  difficulty: {20, 71, 9},    // Same
  boardSignature: "DIAGRAM_FORMULA_MCQ"  // Same
};

// SET A receives additional directives
const setA_Directives = [
  ...baseDirectives,          // Common to both
  "Emphasize formula application",
  "Prioritize numerical reasoning",
  // ... formula-focused directives
];

// SET B receives different directives
const setB_Directives = [
  ...baseDirectives,          // Common to both
  "Emphasize conceptual clarity",
  "Prioritize qualitative reasoning",
  // ... concept-focused directives
];
```

The AI naturally generates questions matching the emphasized style while maintaining the same IDS, difficulty, and board signature.

---

## Comparison with Other Approaches

### ❌ Approach 1: Pure Prediction (Rejected)
- Both sets identical (same parameters, different questions)
- ✅ Forensically accurate
- ❌ Less pedagogical variety
- ❌ Students miss comprehensive preparation

### ❌ Approach 2: Separate Calibrations (Rejected)
- SET A: IDS 0.91, Difficulty 15/70/15
- SET B: IDS 0.88, Difficulty 25/72/3
- ✅ High pedagogical variety
- ❌ Individual sets deviate from prediction
- ❌ Can't use both for forensic audit

### ✅ Approach 3: Hybrid (Selected)
- Both sets: IDS 0.894, Difficulty 20/71/9
- Variation: Directive-based emphasis only
- ✅ Maintains calibration exactness
- ✅ Provides pedagogical variety
- ✅ Both sets valid for forensic audit
- ✅ Students get comprehensive preparation

---

## Student Preparation Strategy

### Recommended Approach

**Week 1-2: SET A (Formula Mastery)**
- Solve SET A to strengthen calculation skills
- Focus on speed and accuracy in numerical problems
- Build formula recall and application confidence
- Time yourself: 200 minutes for full set

**Week 3-4: SET B (Conceptual Mastery)**
- Solve SET B to deepen conceptual understanding
- Focus on reasoning and principle-based thinking
- Connect concepts to real-world applications
- Time yourself: 200 minutes for full set

**Week 5: Combined Analysis**
- Review both sets together
- Identify topic-wise strengths and weaknesses
- Compare formula-based vs concept-based approaches
- Build integrated understanding

### Pedagogical Synergy

| SET A Strength | SET B Strength | Combined Benefit |
|----------------|----------------|------------------|
| Formula recall | Concept clarity | Complete mastery |
| Calculation speed | Logical reasoning | Adaptive problem-solving |
| Numerical accuracy | Intuitive understanding | Exam confidence |
| Quantitative skills | Qualitative skills | 360° preparation |

---

## Forensic Audit Readiness (Phase 7)

### Why Both Sets Are Valid Predictions

Since both sets maintain:
- Same IDS Target (0.894)
- Same Rigor Velocity (1.68)
- Same Difficulty Mix (20/71/9)
- Same Board Signature (DIAGRAM_FORMULA_MCQ)

**Both sets can be used for forensic audit** when comparing to NEET 2026 actual paper.

Expected Phase 7 results:
- **SET A accuracy:** ~X% topic overlap, Y% exact match
- **SET B accuracy:** ~X% topic overlap, Y% exact match
- **Combined (SET A + SET B):** Higher total coverage due to 90 questions

The strategic differentiation **enhances preparation** without compromising **prediction accuracy**.

---

## Technical Implementation

### Generator Script
`scripts/oracle/phase_generate_flagship_neet.ts`

### Key Code Section
```typescript
const setSpecificDirectives = setName === 'SET_A' ? [
  '🎯 SET A STRATEGIC EMPHASIS:',
  '⚡ FORMULA APPLICATION & NUMERICAL REASONING',
  // ... formula directives
] : [
  '🎯 SET B STRATEGIC EMPHASIS:',
  '🧠 CONCEPTUAL CLARITY & QUALITATIVE REASONING',
  // ... concept directives
];

return {
  // ... same IDS, rigor, difficulty for both
  directives: [
    ...baseDirectives,
    ...setSpecificDirectives  // Only difference
  ]
};
```

### Verification
Run `scripts/oracle/verify_flagship_generation.ts` to confirm:
- Both sets maintain calibration parameters
- Question quality meets standards
- Strategic differentiation is evident in question content

---

## References

- **Phase 4 Calibration:** `ai_universal_calibration` table (NEET Physics 2026)
- **Phase 5 Generator:** `scripts/oracle/phase_generate_flagship_neet.ts`
- **Phase 6 Verification:** `scripts/oracle/verify_flagship_generation.ts`
- **Workflow:** `docs/oracle/REPEATABLE_CALIBRATION_WORKFLOW.md`
- **Calibration Data:** `docs/oracle/calibration/engine_config_calibrated_neet_physics.json`

---

## Summary

### The Hybrid Advantage

✅ **Maintains prediction accuracy** (both sets predict NEET 2026)
✅ **Provides pedagogical variety** (formula vs concept emphasis)
✅ **Enables comprehensive preparation** (quantitative + qualitative skills)
✅ **Preserves forensic audit validity** (both sets valid for Phase 7)
✅ **Respects calibration integrity** (Phase 4 parameters unchanged)

**Result:** Students get the best of both worlds - accurate exam prediction AND comprehensive skill development.

---

**Version History:**
- v1.0 (2026-04-29): Initial documentation of Approach 3 Hybrid strategy
