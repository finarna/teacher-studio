# KCET Math Iterative Calibration Report (2021-2025)

**Generated:** 2026-04-14T14:41:59.918Z
**REI Version:** v16.17
**Calibration Method:** Iterative RWC with Multi-Dimensional Question Comparison

---

## Executive Summary

### Overall Performance

- **Average Match Rate:** 62.7%
- **Average Score:** 66.6%
- **Identity Hit Rate:** 79.2%
- **Topic Accuracy:** 50.0%
- **Difficulty Accuracy:** 60.0%

### Calibration Effort

- **Total Iterations:** 7
- **Average Iterations per Year:** 1.8
- **Years Calibrated:** 4

### Convergence Status

❌ **NEEDS IMPROVEMENT** - Only 0/4 years achieved 80%+ match rate


---

## Year-by-Year Calibration Results

| Year | Iterations | Match Rate | Avg Score | IHR | Topic Acc | Diff Acc | IDS (Pred) | IDS (Actual) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2022 | 3 | 58.3% | 58.3% | 58.3% | 45.0% | 78.3% | 0.872 | 0.740 | ❌ Below |
| 2023 | 2 | 59.6% | 59.6% | 62.5% | 40.0% | 81.7% | 0.894 | 0.760 | ❌ Below |
| 2024 | 1 | 66.4% | 66.4% | 70.8% | 50.0% | 80.0% | 0.894 | 0.680 | ❌ Below |
| 2025 | 1 | 66.6% | 66.6% | 79.2% | 50.0% | 60.0% | 0.894 | 0.790 | ❌ Below |

**Legend:**
- **IHR:** Identity Hit Rate (% of identities correctly predicted)
- **Topic Acc:** Topic Accuracy (% of questions with correct topic)
- **Diff Acc:** Difficulty Accuracy (% of questions with correct difficulty)
- **IDS:** Item Difficulty Score (average cognitive demand)

### Detailed Iteration Logs

#### Year 2022

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 35.0% | 47.5% | 24 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.02 |

#### Year 2023

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 35.0% | 47.5% | 24 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.02 |
| 2 | 36.7% | 48.5% | 24 identities adjusted, Rigor -0.02, IDS +0.02 |

#### Year 2024

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 35.0% | 47.5% | 24 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.02 |
| 2 | 36.7% | 48.5% | 24 identities adjusted, Rigor -0.02, IDS +0.02 |

#### Year 2025

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 35.0% | 47.5% | 24 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.02 |
| 2 | 36.7% | 48.5% | 24 identities adjusted, Rigor -0.02, IDS +0.02 |


---

## Final Calibrated Parameters

### Engine Configuration

```json
{
  "engine_version": "4.0",
  "rigor_drift_multiplier": 1.6816666666666666,
  "ids_baseline": 0.8941666666666667,
  "synthesis_weight": 0.294,
  "trap_weight": 0.3,
  "intent_learning_rate": 0.25,
  "volatility_factor": 1.15,
  "solve_tension_multiplier": 1.12,
  "projection_buffer": 1.05,
  "last_updated": "2026-04-14T14:41:59.919Z"
}
```

### Top 10 High-Confidence Identities

| Rank | Identity | Confidence | Classification |
| :--- | :--- | :--- | :--- |
| 1 | MAT-001 | 99.0% | 🔥 High-Yield |
| 2 | MAT-003 | 99.0% | 🔥 High-Yield |
| 3 | MAT-004 | 99.0% | 🔥 High-Yield |
| 4 | MAT-013 | 99.0% | 🔥 High-Yield |
| 5 | MAT-014 | 99.0% | 🔥 High-Yield |
| 6 | MAT-016 | 99.0% | 🔥 High-Yield |
| 7 | MAT-017 | 99.0% | 🔥 High-Yield |
| 8 | MAT-020 | 99.0% | 🔥 High-Yield |
| 9 | MAT-022 | 99.0% | 🔥 High-Yield |
| 10 | MAT-024 | 99.0% | 🔥 High-Yield |

### Low-Confidence Identities (< 40%)

| Identity | Confidence | Status |
| :--- | :--- | :--- |
| MAT-011 | 35.0% | ⚠️ Rarely appears |
| MAT-015 | 35.0% | ⚠️ Rarely appears |
| MAT-018 | 35.0% | ⚠️ Rarely appears |
| MAT-021 | 35.0% | ⚠️ Rarely appears |
| MAT-023 | 37.5% | ⚠️ Rarely appears |
| MAT-002 | 38.7% | ⚠️ Rarely appears |


---

## Identity Bank Evolution

### Confidence Changes (2021 → 2025)

#### Top 10 Confidence Gainers

| Identity | Topic | Initial | Final | Change |
| :--- | :--- | :--- | :--- | :--- |
| MAT-001 | Sets | 75.7% | 99.0% | +23.3% |
| MAT-020 | Application of Derivatives | 87.2% | 99.0% | +11.8% |
| MAT-024 | Application of Integrals | 91.2% | 99.0% | +7.8% |
| MAT-025 | Differential Equations | 92.2% | 99.0% | +6.8% |
| MAT-016 | Matrices | 93.0% | 99.0% | +6.0% |
| MAT-006 | Linear Inequalities | 88.5% | 94.0% | +5.5% |
| MAT-022 | Integrals | 95.7% | 99.0% | +3.3% |
| MAT-017 | Determinants | 98.9% | 99.0% | +0.1% |

#### Top 10 Confidence Losers

| Identity | Topic | Initial | Final | Change |
| :--- | :--- | :--- | :--- | :--- |
| MAT-012 | Limits & Derivatives | 68.2% | 53.2% | -15.0% |
| MAT-028 | 3D Geometry | 67.9% | 52.9% | -15.0% |
| MAT-009 | Sequences & Series | 61.7% | 46.7% | -15.0% |
| MAT-007 | Permutations & Combinations | 56.5% | 41.5% | -15.0% |
| MAT-019 | Continuity & Differentiability | 58.1% | 43.1% | -15.0% |
| MAT-002 | Relations & Functions | 53.7% | 38.7% | -15.0% |
| MAT-011 | Conic Sections | 49.1% | 35.0% | -14.1% |
| MAT-008 | Binomial Theorem | 72.1% | 70.1% | -2.0% |
| MAT-010 | Straight Lines | 86.6% | 84.6% | -2.0% |
| MAT-015 | Inverse Trig Functions | 35.0% | 35.0% | -0.0% |


---

## Topic Distribution Analysis

### Topic Coverage (2025 Final Paper)

| Topic | Questions | Percentage | Trend |
| :--- | :--- | :--- | :--- |
| Continuity and Differentiability | 6 | 10.0% | ➡️ Stable |
| Probability | 6 | 10.0% | ➡️ Stable |
| Matrices | 5 | 8.3% | ➡️ Stable |
| Integrals | 5 | 8.3% | ➡️ Stable |
| Inverse Trigonometric Functions | 4 | 6.7% | ➡️ Stable |
| Relations and Functions | 4 | 6.7% | ➡️ Stable |
| Vector Algebra | 3 | 5.0% | ➡️ Stable |
| Three Dimensional Geometry | 3 | 5.0% | ➡️ Stable |
| Determinants | 3 | 5.0% | ➡️ Stable |
| Differential Equations | 2 | 3.3% | ➡️ Stable |
| Application of Integrals | 2 | 3.3% | ➡️ Stable |
| Linear Programming | 2 | 3.3% | ➡️ Stable |
| Permutations and Combinations | 2 | 3.3% | ➡️ Stable |
| Inverse Trigonometric Functions & Trigonometric Identities | 1 | 1.7% | ➡️ Stable |
| Conic Sections | 1 | 1.7% | ➡️ Stable |
| Application of Derivatives | 1 | 1.7% | ➡️ Stable |
| Straight Lines | 1 | 1.7% | ➡️ Stable |
| Sets | 1 | 1.7% | ➡️ Stable |
| Complex Numbers | 1 | 1.7% | ➡️ Stable |
| Limits and Derivatives | 1 | 1.7% | ➡️ Stable |
| Linear Inequalities | 1 | 1.7% | ➡️ Stable |
| Binomial Theorem | 1 | 1.7% | ➡️ Stable |
| Statistics | 1 | 1.7% | ➡️ Stable |
| Relations and Functions (Sets Foundation) | 1 | 1.7% | ➡️ Stable |
| Matrices and Determinants | 1 | 1.7% | ➡️ Stable |
| Sequences and Series | 1 | 1.7% | ➡️ Stable |


---

## Validation Metrics

### Overall System Confidence

**System Confidence Score:** 66.4%

⚠️ **FAIR** - Limited confidence, recommend further calibration

### Prediction Stability

**Year-over-Year Variance:** 0.2%

✅ **STABLE** - Consistent performance across years


---

## Recommendations & Insights

### High-Yield Identities for 2026

Identified **15 high-confidence identities** (≥75%) for focused preparation:

- **MAT-001**: 99.0% confidence
- **MAT-003**: 99.0% confidence
- **MAT-004**: 99.0% confidence
- **MAT-013**: 99.0% confidence
- **MAT-014**: 99.0% confidence
- **MAT-016**: 99.0% confidence
- **MAT-017**: 99.0% confidence
- **MAT-020**: 99.0% confidence
- **MAT-022**: 99.0% confidence
- **MAT-024**: 99.0% confidence
- **MAT-025**: 99.0% confidence
- **MAT-026**: 99.0% confidence
- **MAT-029**: 99.0% confidence
- **MAT-006**: 94.0% confidence
- **MAT-010**: 84.6% confidence

### Calibration Insights

- ⚠️ **Topic Prediction Variance**: Consider refining topic allocation algorithm

### Next Steps

1. **Deploy Calibrated Parameters**: Update production engine with final parameters
2. **Generate 2026 Flagship**: Use calibrated identities to create practice papers
3. **Monitor Performance**: Track student accuracy on high-confidence identities
4. **Post-Exam Validation**: Compare 2026 actual paper with predictions

