# NEET Chemistry Iterative Calibration Report (2021-2025)

**Generated:** 2026-04-30T20:51:16.986Z
**REI Version:** v16.17
**Calibration Method:** Iterative RWC with Multi-Dimensional Question Comparison

---

## Executive Summary

### Overall Performance

- **Average Match Rate:** 71.2%
- **Average Score:** 74.0%
- **Identity Hit Rate:** 84.2%
- **Topic Accuracy:** 47.6%
- **Difficulty Accuracy:** 88.0%

### Calibration Effort

- **Total Iterations:** 8
- **Average Iterations per Year:** 2.0
- **Years Calibrated:** 4

### Convergence Status

❌ **NEEDS IMPROVEMENT** - Only 0/4 years achieved 80%+ match rate


---

## Year-by-Year Calibration Results

| Year | Iterations | Match Rate | Avg Score | IHR | Topic Acc | Diff Acc | IDS (Pred) | IDS (Actual) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2022 | 3 | 71.4% | 71.4% | 90.0% | 40.0% | 72.0% | 0.894 | 0.640 | ⚠️ Close |
| 2023 | 3 | 69.9% | 69.9% | 85.0% | 34.0% | 86.0% | 0.944 | 0.810 | ❌ Below |
| 2024 | 1 | 69.4% | 69.4% | 80.0% | 42.0% | 84.0% | 0.944 | 0.690 | ❌ Below |
| 2025 | 1 | 74.0% | 74.0% | 84.2% | 47.6% | 88.0% | 0.944 | 0.780 | ⚠️ Close |

**Legend:**
- **IHR:** Identity Hit Rate (% of identities correctly predicted)
- **Topic Acc:** Topic Accuracy (% of questions with correct topic)
- **Diff Acc:** Difficulty Accuracy (% of questions with correct difficulty)
- **IDS:** Item Difficulty Score (average cognitive demand)

### Detailed Iteration Logs

#### Year 2022

No iteration history available.

#### Year 2023

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 30.0% | 47.2% | 20 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 2 | 30.0% | 47.1% | 20 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |

#### Year 2024

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 30.0% | 47.2% | 20 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 2 | 30.0% | 47.1% | 20 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |

#### Year 2025

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 30.0% | 47.2% | 20 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 2 | 30.0% | 47.1% | 20 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |


---

## Final Calibrated Parameters

### Engine Configuration

```json
{
  "engine_version": "4.0",
  "rigor_drift_multiplier": 1.6496666666666666,
  "ids_baseline": 0.9441666666666667,
  "synthesis_weight": 0.26520000000000005,
  "trap_weight": 0.3,
  "intent_learning_rate": 0.25,
  "volatility_factor": 1.15,
  "solve_tension_multiplier": 1.12,
  "projection_buffer": 1.05,
  "last_updated": "2026-04-30T20:51:16.986Z"
}
```

### Top 10 High-Confidence Identities

| Rank | Identity | Confidence | Classification |
| :--- | :--- | :--- | :--- |
| 1 | ID-NC-001 | 99.0% | 🔥 High-Yield |
| 2 | ID-NC-002 | 99.0% | 🔥 High-Yield |
| 3 | ID-NC-003 | 99.0% | 🔥 High-Yield |
| 4 | ID-NC-004 | 99.0% | 🔥 High-Yield |
| 5 | ID-NC-005 | 99.0% | 🔥 High-Yield |
| 6 | ID-NC-006 | 99.0% | 🔥 High-Yield |
| 7 | ID-NC-007 | 99.0% | 🔥 High-Yield |
| 8 | ID-NC-008 | 99.0% | 🔥 High-Yield |
| 9 | ID-NC-009 | 99.0% | 🔥 High-Yield |
| 10 | ID-NC-010 | 99.0% | 🔥 High-Yield |

### Low-Confidence Identities (< 40%)

✅ All identities have confidence >= 40%


---

## Identity Bank Evolution

### Confidence Changes (2021 → 2025)

#### Top 10 Confidence Gainers

| Identity | Topic | Initial | Final | Change |
| :--- | :--- | :--- | :--- | :--- |
| ID-NC-019 | Hydrocarbons | 20.0% | 68.0% | +48.0% |
| ID-NC-020 | Purification and Characterisation of Organic Compounds | 20.0% | 68.0% | +48.0% |
| ID-NC-018 | Some Basic Principles of Organic Chemistry | 70.0% | 99.0% | +29.0% |

#### Top 10 Confidence Losers

| Identity | Topic | Initial | Final | Change |
| :--- | :--- | :--- | :--- | :--- |
| ID-NC-001 | Solutions | 200.0% | 99.0% | -101.0% |
| ID-NC-002 | Aldehydes, Ketones and Carboxylic Acids | 200.0% | 99.0% | -101.0% |
| ID-NC-003 | Redox Reactions and Electrochemistry | 150.0% | 99.0% | -51.0% |
| ID-NC-004 | Haloalkanes and Haloarenes | 150.0% | 99.0% | -51.0% |
| ID-NC-005 | Chemical Kinetics | 150.0% | 99.0% | -51.0% |
| ID-NC-006 | Coordination Compounds | 150.0% | 99.0% | -51.0% |
| ID-NC-007 | d and f Block Elements | 150.0% | 99.0% | -51.0% |
| ID-NC-008 | Chemical Bonding and Molecular Structure | 150.0% | 99.0% | -51.0% |
| ID-NC-009 | Amines | 150.0% | 99.0% | -51.0% |
| ID-NC-015 | Atomic Structure | 100.0% | 89.0% | -11.0% |


---

## Topic Distribution Analysis

### Topic Coverage (2025 Final Paper)

| Topic | Questions | Percentage | Trend |
| :--- | :--- | :--- | :--- |
| Unknown | 5 | 8.3% | ➡️ Stable |
| Solutions | 3 | 5.0% | ➡️ Stable |
| Aldehydes, Ketones and Carboxylic Acids | 3 | 5.0% | ➡️ Stable |
| Coordination Compounds | 3 | 5.0% | ➡️ Stable |
| Haloalkanes and Haloarenes | 3 | 5.0% | ➡️ Stable |
| Chemical Kinetics | 3 | 5.0% | ➡️ Stable |
| Atoms | 2 | 3.3% | ➡️ Stable |
| Chemical Equilibrium | 2 | 3.3% | ➡️ Stable |
| Amines | 2 | 3.3% | ➡️ Stable |
| Chemical Bonding and Molecular Structure | 2 | 3.3% | ➡️ Stable |
| Classification of Elements and Periodicity in Properties | 2 | 3.3% | ➡️ Stable |
| Biomolecules | 2 | 3.3% | ➡️ Stable |
| Some Basic Concepts of Chemistry | 2 | 3.3% | ➡️ Stable |
| Organic Chemistry - Some Basic Principles and Techniques | 2 | 3.3% | ➡️ Stable |
| The p-Block Elements | 2 | 3.3% | ➡️ Stable |
| Equilibrium | 1 | 1.7% | ➡️ Stable |
| Qualitative Analysis of Cations | 1 | 1.7% | ➡️ Stable |
| Coordination Compounds and d-and f-Block Elements | 1 | 1.7% | ➡️ Stable |
| KINEMATICS | 1 | 1.7% | ➡️ Stable |
| Redox Reactions | 1 | 1.7% | ➡️ Stable |
| Alcohols, Phenols and Ethers | 1 | 1.7% | ➡️ Stable |
| The d-and f-Block Elements | 1 | 1.7% | ➡️ Stable |
| Electrochemistry | 1 | 1.7% | ➡️ Stable |
| Thermodynamics | 1 | 1.7% | ➡️ Stable |
| Hydrocarbons and Isomerism | 1 | 1.7% | ➡️ Stable |
| Organic Chemistry: Alcohols, Phenols, Ethers and Amines | 1 | 1.7% | ➡️ Stable |
| Hydrocarbons and Haloarenes | 1 | 1.7% | ➡️ Stable |


---

## Validation Metrics

### Overall System Confidence

**System Confidence Score:** 73.2%

⚠️ **FAIR** - Limited confidence, recommend further calibration

### Prediction Stability

**Year-over-Year Variance:** 4.6%

✅ **STABLE** - Consistent performance across years


---

## Recommendations & Insights

### High-Yield Identities for 2026

Identified **18 high-confidence identities** (≥75%) for focused preparation:

- **ID-NC-001**: 99.0% confidence
- **ID-NC-002**: 99.0% confidence
- **ID-NC-003**: 99.0% confidence
- **ID-NC-004**: 99.0% confidence
- **ID-NC-005**: 99.0% confidence
- **ID-NC-006**: 99.0% confidence
- **ID-NC-007**: 99.0% confidence
- **ID-NC-008**: 99.0% confidence
- **ID-NC-009**: 99.0% confidence
- **ID-NC-010**: 99.0% confidence
- **ID-NC-011**: 99.0% confidence
- **ID-NC-012**: 99.0% confidence
- **ID-NC-013**: 99.0% confidence
- **ID-NC-014**: 99.0% confidence
- **ID-NC-016**: 99.0% confidence

### Calibration Insights

- ⚠️ **Topic Prediction Variance**: Consider refining topic allocation algorithm

### Next Steps

1. **Deploy Calibrated Parameters**: Update production engine with final parameters
2. **Generate 2026 Flagship**: Use calibrated identities to create practice papers
3. **Monitor Performance**: Track student accuracy on high-confidence identities
4. **Post-Exam Validation**: Compare 2026 actual paper with predictions

