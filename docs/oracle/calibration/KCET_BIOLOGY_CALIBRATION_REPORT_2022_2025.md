# KCET Biology Iterative Calibration Report (2021-2025)

**Generated:** 2026-04-17T19:54:02.886Z
**REI Version:** v16.17
**Calibration Method:** Iterative RWC with Multi-Dimensional Question Comparison

---

## Executive Summary

### Overall Performance

- **Average Match Rate:** 45.9%
- **Average Score:** 50.7%
- **Identity Hit Rate:** 65.7%
- **Topic Accuracy:** 21.7%
- **Difficulty Accuracy:** 56.7%

### Calibration Effort

- **Total Iterations:** 6
- **Average Iterations per Year:** 2.0
- **Years Calibrated:** 3

### Convergence Status

❌ **NEEDS IMPROVEMENT** - Only 0/3 years achieved 80%+ match rate


---

## Year-by-Year Calibration Results

| Year | Iterations | Match Rate | Avg Score | IHR | Topic Acc | Diff Acc | IDS (Pred) | IDS (Actual) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2023 | 4 | 42.2% | 42.2% | 51.4% | 25.0% | 45.0% | 0.993 | 0.640 | ❌ Below |
| 2024 | 1 | 44.7% | 44.7% | 60.0% | 20.0% | 43.3% | 0.993 | 0.640 | ❌ Below |
| 2025 | 1 | 50.7% | 50.7% | 65.7% | 21.7% | 56.7% | 0.993 | 0.640 | ❌ Below |

**Legend:**
- **IHR:** Identity Hit Rate (% of identities correctly predicted)
- **Topic Acc:** Topic Accuracy (% of questions with correct topic)
- **Diff Acc:** Difficulty Accuracy (% of questions with correct difficulty)
- **IDS:** Item Difficulty Score (average cognitive demand)

### Detailed Iteration Logs

#### Year 2023

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 18.3% | 33.4% | 35 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 2 | 13.3% | 27.7% | 35 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 3 | 11.7% | 26.6% | 35 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |

#### Year 2024

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 18.3% | 33.4% | 35 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 2 | 13.3% | 27.7% | 35 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 3 | 11.7% | 26.6% | 35 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |

#### Year 2025

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 18.3% | 33.4% | 35 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 2 | 13.3% | 27.7% | 35 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 3 | 11.7% | 26.6% | 35 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |


---

## Final Calibrated Parameters

### Engine Configuration

```json
{
  "engine_version": "4.0",
  "rigor_drift_multiplier": 1.6216666666666666,
  "ids_baseline": 0.9925,
  "synthesis_weight": 0.25400000000000006,
  "trap_weight": 0.3,
  "intent_learning_rate": 0.25,
  "volatility_factor": 1.15,
  "solve_tension_multiplier": 1.12,
  "projection_buffer": 1.05,
  "last_updated": "2026-04-17T19:54:02.886Z"
}
```

### Top 10 High-Confidence Identities

| Rank | Identity | Confidence | Classification |
| :--- | :--- | :--- | :--- |
| 1 | BIO-010 | 76.0% | ⚡ Moderate |
| 2 | BIO-002 | 68.0% | ⚡ Moderate |
| 3 | BIO-003 | 68.0% | ⚡ Moderate |
| 4 | BIO-009 | 68.0% | ⚡ Moderate |
| 5 | BIO-011 | 68.0% | ⚡ Moderate |
| 6 | BIO-018 | 68.0% | ⚡ Moderate |
| 7 | BIO-030 | 68.0% | ⚡ Moderate |
| 8 | BIO-034 | 68.0% | ⚡ Moderate |
| 9 | BIO-001 | 64.0% | ⚡ Moderate |
| 10 | BIO-004 | 64.0% | ⚡ Moderate |

### Low-Confidence Identities (< 40%)

| Identity | Confidence | Status |
| :--- | :--- | :--- |
| BIO-005 | 35.0% | ⚠️ Rarely appears |
| BIO-006 | 35.0% | ⚠️ Rarely appears |
| BIO-007 | 35.0% | ⚠️ Rarely appears |
| BIO-008 | 35.0% | ⚠️ Rarely appears |
| BIO-013 | 35.0% | ⚠️ Rarely appears |
| BIO-014 | 35.0% | ⚠️ Rarely appears |
| BIO-015 | 35.0% | ⚠️ Rarely appears |
| BIO-016 | 35.0% | ⚠️ Rarely appears |
| BIO-017 | 35.0% | ⚠️ Rarely appears |
| BIO-019 | 35.0% | ⚠️ Rarely appears |
| BIO-020 | 35.0% | ⚠️ Rarely appears |
| BIO-022 | 35.0% | ⚠️ Rarely appears |
| BIO-023 | 35.0% | ⚠️ Rarely appears |
| BIO-027 | 35.0% | ⚠️ Rarely appears |
| BIO-031 | 35.0% | ⚠️ Rarely appears |
| BIO-032 | 35.0% | ⚠️ Rarely appears |
| BIO-033 | 35.0% | ⚠️ Rarely appears |


---

## Identity Bank Evolution

### Confidence Changes (2021 → 2025)

#### Top 10 Confidence Gainers

| Identity | Topic | Initial | Final | Change |
| :--- | :--- | :--- | :--- | :--- |
| BIO-010 | Cell Cycle | 40.0% | 76.0% | +36.0% |
| BIO-002 | Biological Classification | 40.0% | 68.0% | +28.0% |
| BIO-003 | Plant Kingdom | 40.0% | 68.0% | +28.0% |
| BIO-009 | Biomolecules | 40.0% | 68.0% | +28.0% |
| BIO-011 | Transport in Plants | 40.0% | 68.0% | +28.0% |
| BIO-018 | Body Fluids | 40.0% | 68.0% | +28.0% |
| BIO-030 | Food Production | 40.0% | 68.0% | +28.0% |
| BIO-034 | Ecosystem | 40.0% | 68.0% | +28.0% |
| BIO-001 | Living World | 40.0% | 64.0% | +24.0% |
| BIO-004 | Animal Kingdom | 40.0% | 64.0% | +24.0% |

#### Top 10 Confidence Losers

| Identity | Topic | Initial | Final | Change |
| :--- | :--- | :--- | :--- | :--- |
| BIO-005 | Morphology of Plants | 40.0% | 35.0% | -5.0% |
| BIO-006 | Anatomy of Plants | 40.0% | 35.0% | -5.0% |
| BIO-007 | Structural Org in Animals | 40.0% | 35.0% | -5.0% |
| BIO-008 | Cell: Unit of Life | 40.0% | 35.0% | -5.0% |
| BIO-013 | Photosynthesis | 40.0% | 35.0% | -5.0% |
| BIO-014 | Respiration in Plants | 40.0% | 35.0% | -5.0% |
| BIO-015 | Plant Growth | 40.0% | 35.0% | -5.0% |
| BIO-016 | Digestion | 40.0% | 35.0% | -5.0% |
| BIO-017 | Breathing | 40.0% | 35.0% | -5.0% |
| BIO-019 | Excretion | 40.0% | 35.0% | -5.0% |


---

## Topic Distribution Analysis

### Topic Coverage (2025 Final Paper)

| Topic | Questions | Percentage | Trend |
| :--- | :--- | :--- | :--- |
| Principles of Inheritance and Variation | 5 | 8.3% | ➡️ Stable |
| Molecular Basis of Inheritance | 3 | 5.0% | ➡️ Stable |
| Human Reproduction | 3 | 5.0% | ➡️ Stable |
| Reproductive Health | 3 | 5.0% | ➡️ Stable |
| Human Health and Disease | 3 | 5.0% | ➡️ Stable |
| Evolution | 3 | 5.0% | ➡️ Stable |
| Sexual Reproduction in Flowering Plants | 3 | 5.0% | ➡️ Stable |
| Microbes in Human Welfare | 3 | 5.0% | ➡️ Stable |
| Ecosystem | 2 | 3.3% | ➡️ Stable |
| Organisms and Populations | 2 | 3.3% | ➡️ Stable |
| Biotechnology and its Applications | 2 | 3.3% | ➡️ Stable |
| Anatomy of Flowering Plants | 2 | 3.3% | ➡️ Stable |
| Cell Cycle and Cell Division | 2 | 3.3% | ➡️ Stable |
| Biodiversity and Conservation | 2 | 3.3% | ➡️ Stable |
| Biotechnology: Principles and Processes | 2 | 3.3% | ➡️ Stable |
| Morphology of Flowering Plants | 1 | 1.7% | ➡️ Stable |
| Structural Organisation in Animals (Frog) | 1 | 1.7% | ➡️ Stable |
| The Living World | 1 | 1.7% | ➡️ Stable |
| Animal Kingdom | 1 | 1.7% | ➡️ Stable |
| Body Fluids and Circulation | 1 | 1.7% | ➡️ Stable |
| Plant Kingdom | 1 | 1.7% | ➡️ Stable |
| Excretory Products and their Elimination | 1 | 1.7% | ➡️ Stable |
| Plant Growth and Development | 1 | 1.7% | ➡️ Stable |
| Biomolecules | 1 | 1.7% | ➡️ Stable |
| Neural Control and Coordination | 1 | 1.7% | ➡️ Stable |
| Chemical Coordination and Integration | 1 | 1.7% | ➡️ Stable |
| Respiration in Plants | 1 | 1.7% | ➡️ Stable |
| Breathing and Exchange of Gases | 1 | 1.7% | ➡️ Stable |
| Biological Classification | 1 | 1.7% | ➡️ Stable |
| Photosynthesis in Higher Plants | 1 | 1.7% | ➡️ Stable |
| Biological Classification / Microbes in Human Welfare | 1 | 1.7% | ➡️ Stable |
| Biotechnology: Principles and Processes & Applications | 1 | 1.7% | ➡️ Stable |
| Strategies for Enhancement in Food Production | 1 | 1.7% | ➡️ Stable |
| Locomotion and Movement | 1 | 1.7% | ➡️ Stable |
| Cell: The Unit of Life | 1 | 1.7% | ➡️ Stable |


---

## Validation Metrics

### Overall System Confidence

**System Confidence Score:** 50.0%

⚠️ **FAIR** - Limited confidence, recommend further calibration

### Prediction Stability

**Year-over-Year Variance:** 6.0%

⚡ **MODERATE** - Some fluctuation in performance


---

## Recommendations & Insights

### High-Yield Identities for 2026

Identified **1 high-confidence identities** (≥75%) for focused preparation:

- **BIO-010**: 76.0% confidence

### Calibration Insights

- ⚠️ **Topic Prediction Variance**: Consider refining topic allocation algorithm
- 🎯 **Identity Refinement Needed**: Some identities may need re-definition

### Next Steps

1. **Deploy Calibrated Parameters**: Update production engine with final parameters
2. **Generate 2026 Flagship**: Use calibrated identities to create practice papers
3. **Monitor Performance**: Track student accuracy on high-confidence identities
4. **Post-Exam Validation**: Compare 2026 actual paper with predictions

