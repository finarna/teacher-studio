# KCET Chemistry Iterative Calibration Report (2021-2025)

**Generated:** 2026-04-17T11:24:37.786Z
**REI Version:** v16.17
**Calibration Method:** Iterative RWC with Multi-Dimensional Question Comparison

---

## Executive Summary

### Overall Performance

- **Average Match Rate:** 54.8%
- **Average Score:** 51.1%
- **Identity Hit Rate:** 59.3%
- **Topic Accuracy:** 21.7%
- **Difficulty Accuracy:** 75.0%

### Calibration Effort

- **Total Iterations:** 11
- **Average Iterations per Year:** 2.8
- **Years Calibrated:** 4

### Convergence Status

❌ **NEEDS IMPROVEMENT** - Only 0/4 years achieved 80%+ match rate


---

## Year-by-Year Calibration Results

| Year | Iterations | Match Rate | Avg Score | IHR | Topic Acc | Diff Acc | IDS (Pred) | IDS (Actual) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2022 | 5 | 51.0% | 51.0% | 60.7% | 26.7% | 63.3% | 0.953 | 0.740 | ❌ Below |
| 2023 | 2 | 63.2% | 63.2% | 71.4% | 35.0% | 85.0% | 0.953 | 0.760 | ❌ Below |
| 2024 | 3 | 54.0% | 54.0% | 59.3% | 30.0% | 76.7% | 1.000 | 0.680 | ❌ Below |
| 2025 | 1 | 51.1% | 51.1% | 59.3% | 21.7% | 75.0% | 1.000 | 0.740 | ❌ Below |

**Legend:**
- **IHR:** Identity Hit Rate (% of identities correctly predicted)
- **Topic Acc:** Topic Accuracy (% of questions with correct topic)
- **Diff Acc:** Difficulty Accuracy (% of questions with correct difficulty)
- **IDS:** Item Difficulty Score (average cognitive demand)

### Detailed Iteration Logs

#### Year 2022

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 23.3% | 49.7% | 26 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 2 | 20.0% | 47.6% | 27 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |

#### Year 2023

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 23.3% | 49.7% | 26 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 2 | 20.0% | 47.6% | 27 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |

#### Year 2024

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 23.3% | 49.7% | 26 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 2 | 20.0% | 47.6% | 27 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 3 | 13.3% | 33.4% | 27 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 4 | 15.0% | 33.6% | 27 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |

#### Year 2025

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 23.3% | 49.7% | 26 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 2 | 20.0% | 47.6% | 27 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 3 | 13.3% | 33.4% | 27 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |
| 4 | 15.0% | 33.6% | 27 identities adjusted, Rigor -0.02, Intent weights adjusted, IDS +0.03 |


---

## Final Calibrated Parameters

### Engine Configuration

```json
{
  "engine_version": "4.0",
  "rigor_drift_multiplier": 1.6066666666666667,
  "ids_baseline": 1,
  "synthesis_weight": 0.2580000000000001,
  "trap_weight": 0.3,
  "intent_learning_rate": 0.25,
  "volatility_factor": 1.15,
  "solve_tension_multiplier": 1.12,
  "projection_buffer": 1.05,
  "last_updated": "2026-04-17T11:24:37.786Z"
}
```

### Top 10 High-Confidence Identities

| Rank | Identity | Confidence | Classification |
| :--- | :--- | :--- | :--- |
| 1 | CHM-007 | 99.0% | 🔥 High-Yield |
| 2 | CHM-009 | 99.0% | 🔥 High-Yield |
| 3 | CHM-016 | 99.0% | 🔥 High-Yield |
| 4 | CHM-027 | 99.0% | 🔥 High-Yield |
| 5 | CHM-005 | 96.0% | 🔥 High-Yield |
| 6 | CHM-014 | 96.0% | 🔥 High-Yield |
| 7 | CHM-015 | 96.0% | 🔥 High-Yield |
| 8 | CHM-017 | 96.0% | 🔥 High-Yield |
| 9 | CHM-018 | 96.0% | 🔥 High-Yield |
| 10 | CHM-019 | 96.0% | 🔥 High-Yield |

### Low-Confidence Identities (< 40%)

| Identity | Confidence | Status |
| :--- | :--- | :--- |
| CHM-002 | 35.0% | ⚠️ Rarely appears |
| CHM-003 | 35.0% | ⚠️ Rarely appears |
| CHM-020 | 35.0% | ⚠️ Rarely appears |
| CHM-023 | 35.0% | ⚠️ Rarely appears |
| CHM-024 | 35.0% | ⚠️ Rarely appears |
| CHM-029 | 35.0% | ⚠️ Rarely appears |


---

## Identity Bank Evolution

### Confidence Changes (2021 → 2025)

#### Top 10 Confidence Gainers

| Identity | Topic | Initial | Final | Change |
| :--- | :--- | :--- | :--- | :--- |
| CHM-007 | States of Matter | 40.0% | 99.0% | +59.0% |
| CHM-009 | Equilibrium | 40.0% | 99.0% | +59.0% |
| CHM-016 | Electrochemistry | 40.0% | 99.0% | +59.0% |
| CHM-027 | Polymers | 40.0% | 99.0% | +59.0% |
| CHM-005 | Chemical Bonding | 40.0% | 96.0% | +56.0% |
| CHM-014 | Solid State | 40.0% | 96.0% | +56.0% |
| CHM-015 | Solutions | 40.0% | 96.0% | +56.0% |
| CHM-017 | Chemical Kinetics | 40.0% | 96.0% | +56.0% |
| CHM-018 | Surface Chemistry | 40.0% | 96.0% | +56.0% |
| CHM-019 | p-Block Elements | 40.0% | 96.0% | +56.0% |

#### Top 10 Confidence Losers

| Identity | Topic | Initial | Final | Change |
| :--- | :--- | :--- | :--- | :--- |
| CHM-002 | Atomic Structure | 40.0% | 35.0% | -5.0% |
| CHM-003 | Atomic Structure | 40.0% | 35.0% | -5.0% |
| CHM-020 | d & f Block Elements | 40.0% | 35.0% | -5.0% |
| CHM-023 | Alcohols & Phenols | 40.0% | 35.0% | -5.0% |
| CHM-024 | Aldehydes & Ketones | 40.0% | 35.0% | -5.0% |
| CHM-029 | Metallurgy | 40.0% | 35.0% | -5.0% |


---

## Topic Distribution Analysis

### Topic Coverage (2025 Final Paper)

| Topic | Questions | Percentage | Trend |
| :--- | :--- | :--- | :--- |
| Solutions | 5 | 8.3% | ➡️ Stable |
| Aldehydes, Ketones and Carboxylic Acids | 5 | 8.3% | ➡️ Stable |
| Electrochemistry | 4 | 6.7% | ➡️ Stable |
| Biomolecules | 4 | 6.7% | ➡️ Stable |
| Coordination Compounds | 4 | 6.7% | ➡️ Stable |
| The d-and f-Block Elements | 4 | 6.7% | ➡️ Stable |
| Chemical Kinetics | 4 | 6.7% | ➡️ Stable |
| Haloalkanes and Haloarenes | 4 | 6.7% | ➡️ Stable |
| Alcohols, Phenols and Ethers | 3 | 5.0% | ➡️ Stable |
| Amines | 2 | 3.3% | ➡️ Stable |
| Chemical Equilibrium | 2 | 3.3% | ➡️ Stable |
| Chemical Thermodynamics | 2 | 3.3% | ➡️ Stable |
| Organic Chemistry - Some Basic Principles and Techniques | 2 | 3.3% | ➡️ Stable |
| Aldehydes, Ketones, and Carboxylic Acids | 1 | 1.7% | ➡️ Stable |
| Hydrocarbons and General Organic Chemistry | 1 | 1.7% | ➡️ Stable |
| Chemistry in Everyday Life | 1 | 1.7% | ➡️ Stable |
| Hydrocarbons and Isomerism | 1 | 1.7% | ➡️ Stable |
| Structure of Atom (Foundational for Class 12) | 1 | 1.7% | ➡️ Stable |
| Some Basic Concepts of Chemistry | 1 | 1.7% | ➡️ Stable |
| p-Block Elements | 1 | 1.7% | ➡️ Stable |
| Thermodynamics and Chemical Energetics | 1 | 1.7% | ➡️ Stable |
| Equilibrium | 1 | 1.7% | ➡️ Stable |
| d-and f-Block Elements / Volumetric Analysis | 1 | 1.7% | ➡️ Stable |
| Qualitative Analysis of Cations | 1 | 1.7% | ➡️ Stable |
| p-Block Elements (Group 13) and Chemical Bonding | 1 | 1.7% | ➡️ Stable |
| Classification of Elements and Periodicity in Properties | 1 | 1.7% | ➡️ Stable |
| Organic Chemistry - Qualitative Analysis | 1 | 1.7% | ➡️ Stable |
| Structure of Atom | 1 | 1.7% | ➡️ Stable |


---

## Validation Metrics

### Overall System Confidence

**System Confidence Score:** 50.1%

⚠️ **FAIR** - Limited confidence, recommend further calibration

### Prediction Stability

**Year-over-Year Variance:** 2.8%

✅ **STABLE** - Consistent performance across years


---

## Recommendations & Insights

### High-Yield Identities for 2026

Identified **14 high-confidence identities** (≥75%) for focused preparation:

- **CHM-007**: 99.0% confidence
- **CHM-009**: 99.0% confidence
- **CHM-016**: 99.0% confidence
- **CHM-027**: 99.0% confidence
- **CHM-005**: 96.0% confidence
- **CHM-014**: 96.0% confidence
- **CHM-015**: 96.0% confidence
- **CHM-017**: 96.0% confidence
- **CHM-018**: 96.0% confidence
- **CHM-019**: 96.0% confidence
- **CHM-021**: 96.0% confidence
- **CHM-022**: 96.0% confidence
- **CHM-025**: 96.0% confidence
- **CHM-026**: 96.0% confidence

### Calibration Insights

- ⚠️ **Topic Prediction Variance**: Consider refining topic allocation algorithm
- 🎯 **Identity Refinement Needed**: Some identities may need re-definition

### Next Steps

1. **Deploy Calibrated Parameters**: Update production engine with final parameters
2. **Generate 2026 Flagship**: Use calibrated identities to create practice papers
3. **Monitor Performance**: Track student accuracy on high-confidence identities
4. **Post-Exam Validation**: Compare 2026 actual paper with predictions

