# KCET Physics Iterative Calibration Report (2021-2025)

**Generated:** 2026-04-17T05:44:54.916Z
**REI Version:** v16.17
**Calibration Method:** Iterative RWC with Multi-Dimensional Question Comparison

---

## Executive Summary

### Overall Performance

- **Average Match Rate:** 61.6%
- **Average Score:** 64.5%
- **Identity Hit Rate:** 73.3%
- **Topic Accuracy:** 38.3%
- **Difficulty Accuracy:** 81.7%

### Calibration Effort

- **Total Iterations:** 9
- **Average Iterations per Year:** 2.3
- **Years Calibrated:** 4

### Convergence Status

❌ **NEEDS IMPROVEMENT** - Only 0/4 years achieved 80%+ match rate


---

## Year-by-Year Calibration Results

| Year | Iterations | Match Rate | Avg Score | IHR | Topic Acc | Diff Acc | IDS (Pred) | IDS (Actual) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2022 | 3 | 57.8% | 57.8% | 60.0% | 35.0% | 86.7% | 0.922 | 0.680 | ❌ Below |
| 2023 | 3 | 58.5% | 58.5% | 70.0% | 28.3% | 75.0% | 0.922 | 0.720 | ❌ Below |
| 2024 | 2 | 65.5% | 65.5% | 73.3% | 35.0% | 91.7% | 0.950 | 0.740 | ❌ Below |
| 2025 | 1 | 64.5% | 64.5% | 73.3% | 38.3% | 81.7% | 0.950 | 0.740 | ❌ Below |

**Legend:**
- **IHR:** Identity Hit Rate (% of identities correctly predicted)
- **Topic Acc:** Topic Accuracy (% of questions with correct topic)
- **Diff Acc:** Difficulty Accuracy (% of questions with correct difficulty)
- **IDS:** Item Difficulty Score (average cognitive demand)

### Detailed Iteration Logs

#### Year 2022

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 23.3% | 37.5% | 30 identities adjusted, Rigor -0.01, Intent weights adjusted, IDS +0.03 |

#### Year 2023

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 23.3% | 37.5% | 30 identities adjusted, Rigor -0.01, Intent weights adjusted, IDS +0.03 |

#### Year 2024

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 23.3% | 37.5% | 30 identities adjusted, Rigor -0.01, Intent weights adjusted, IDS +0.03 |
| 2 | 25.0% | 44.8% | 30 identities adjusted, Rigor -0.01, Intent weights adjusted, IDS +0.03 |

#### Year 2025

| Iteration | Match Rate | Avg Score | Key Changes |
| :--- | :--- | :--- | :--- |
| 1 | 23.3% | 37.5% | 30 identities adjusted, Rigor -0.01, Intent weights adjusted, IDS +0.03 |
| 2 | 25.0% | 44.8% | 30 identities adjusted, Rigor -0.01, Intent weights adjusted, IDS +0.03 |


---

## Final Calibrated Parameters

### Engine Configuration

```json
{
  "engine_version": "4.0",
  "rigor_drift_multiplier": 1.6633333333333333,
  "ids_baseline": 0.95,
  "synthesis_weight": 0.22800000000000006,
  "trap_weight": 0.3,
  "intent_learning_rate": 0.25,
  "volatility_factor": 1.15,
  "solve_tension_multiplier": 1.12,
  "projection_buffer": 1.05,
  "last_updated": "2026-04-17T05:44:54.917Z"
}
```

### Top 10 High-Confidence Identities

| Rank | Identity | Confidence | Classification |
| :--- | :--- | :--- | :--- |
| 1 | PHY-004 | 88.0% | 🔥 High-Yield |
| 2 | PHY-010 | 88.0% | 🔥 High-Yield |
| 3 | PHY-009 | 84.0% | 🔥 High-Yield |
| 4 | PHY-012 | 84.0% | 🔥 High-Yield |
| 5 | PHY-021 | 84.0% | 🔥 High-Yield |
| 6 | PHY-003 | 80.0% | ⚡ Moderate |
| 7 | PHY-006 | 80.0% | ⚡ Moderate |
| 8 | PHY-014 | 80.0% | ⚡ Moderate |
| 9 | PHY-015 | 80.0% | ⚡ Moderate |
| 10 | PHY-017 | 80.0% | ⚡ Moderate |

### Low-Confidence Identities (< 40%)

| Identity | Confidence | Status |
| :--- | :--- | :--- |
| PHY-001 | 35.0% | ⚠️ Rarely appears |
| PHY-005 | 35.0% | ⚠️ Rarely appears |
| PHY-019 | 35.0% | ⚠️ Rarely appears |
| PHY-020 | 35.0% | ⚠️ Rarely appears |
| PHY-023 | 35.0% | ⚠️ Rarely appears |
| PHY-029 | 35.0% | ⚠️ Rarely appears |
| PHY-030 | 35.0% | ⚠️ Rarely appears |


---

## Identity Bank Evolution

### Confidence Changes (2021 → 2025)

#### Top 10 Confidence Gainers

| Identity | Topic | Initial | Final | Change |
| :--- | :--- | :--- | :--- | :--- |
| PHY-004 | Laws of Motion | 40.0% | 88.0% | +48.0% |
| PHY-010 | Mechanical Properties of Fluids | 40.0% | 88.0% | +48.0% |
| PHY-009 | Mechanical Properties of Solids | 40.0% | 84.0% | +44.0% |
| PHY-012 | Thermodynamics | 40.0% | 84.0% | +44.0% |
| PHY-021 | EMI | 40.0% | 84.0% | +44.0% |
| PHY-003 | Motion in a Plane | 40.0% | 80.0% | +40.0% |
| PHY-006 | System of Particles | 40.0% | 80.0% | +40.0% |
| PHY-014 | Oscillations | 40.0% | 80.0% | +40.0% |
| PHY-015 | Waves | 40.0% | 80.0% | +40.0% |
| PHY-017 | Electrostatic Potential | 40.0% | 80.0% | +40.0% |

#### Top 10 Confidence Losers

| Identity | Topic | Initial | Final | Change |
| :--- | :--- | :--- | :--- | :--- |
| PHY-001 | Units & Measurements | 40.0% | 35.0% | -5.0% |
| PHY-005 | Work, Energy & Power | 40.0% | 35.0% | -5.0% |
| PHY-019 | Moving Charges & Magnetism | 40.0% | 35.0% | -5.0% |
| PHY-020 | Magnetism & Matter | 40.0% | 35.0% | -5.0% |
| PHY-023 | EM Waves | 40.0% | 35.0% | -5.0% |
| PHY-029 | Semiconductors | 40.0% | 35.0% | -5.0% |
| PHY-030 | Communication Systems | 40.0% | 35.0% | -5.0% |


---

## Topic Distribution Analysis

### Topic Coverage (2025 Final Paper)

| Topic | Questions | Percentage | Trend |
| :--- | :--- | :--- | :--- |
| Moving Charges and Magnetism | 7 | 11.7% | ➡️ Stable |
| Current Electricity | 6 | 10.0% | ➡️ Stable |
| Ray Optics and Optical Instruments | 5 | 8.3% | ➡️ Stable |
| Electric Charges and Fields | 4 | 6.7% | ➡️ Stable |
| Electrostatic Potential and Capacitance | 3 | 5.0% | ➡️ Stable |
| Alternating Current | 3 | 5.0% | ➡️ Stable |
| Laws of Motion | 2 | 3.3% | ➡️ Stable |
| Gravitation | 2 | 3.3% | ➡️ Stable |
| Mechanical Properties of Fluids | 2 | 3.3% | ➡️ Stable |
| Dual Nature of Radiation and Matter | 2 | 3.3% | ➡️ Stable |
| Nuclei | 2 | 3.3% | ➡️ Stable |
| Semiconductor Electronics | 2 | 3.3% | ➡️ Stable |
| Wave Optics | 2 | 3.3% | ➡️ Stable |
| Motion in a Plane | 2 | 3.3% | ➡️ Stable |
| Work, Energy and Power | 2 | 3.3% | ➡️ Stable |
| System of Particles and Rotational Motion | 2 | 3.3% | ➡️ Stable |
| Thermal Properties of Matter | 1 | 1.7% | ➡️ Stable |
| Mechanical Properties of Solids | 1 | 1.7% | ➡️ Stable |
| Units and Measurements | 1 | 1.7% | ➡️ Stable |
| Thermodynamics | 1 | 1.7% | ➡️ Stable |
| Motion in a Straight Line | 1 | 1.7% | ➡️ Stable |
| Magnetism and Matter | 1 | 1.7% | ➡️ Stable |
| Kinetic Theory | 1 | 1.7% | ➡️ Stable |
| Oscillations | 1 | 1.7% | ➡️ Stable |
| Waves | 1 | 1.7% | ➡️ Stable |
| Electromagnetic Waves | 1 | 1.7% | ➡️ Stable |
| Atoms | 1 | 1.7% | ➡️ Stable |
| Electromagnetic Induction | 1 | 1.7% | ➡️ Stable |


---

## Validation Metrics

### Overall System Confidence

**System Confidence Score:** 63.6%

⚠️ **FAIR** - Limited confidence, recommend further calibration

### Prediction Stability

**Year-over-Year Variance:** 1.0%

✅ **STABLE** - Consistent performance across years


---

## Recommendations & Insights

### High-Yield Identities for 2026

Identified **17 high-confidence identities** (≥75%) for focused preparation:

- **PHY-004**: 88.0% confidence
- **PHY-010**: 88.0% confidence
- **PHY-009**: 84.0% confidence
- **PHY-012**: 84.0% confidence
- **PHY-021**: 84.0% confidence
- **PHY-003**: 80.0% confidence
- **PHY-006**: 80.0% confidence
- **PHY-014**: 80.0% confidence
- **PHY-015**: 80.0% confidence
- **PHY-017**: 80.0% confidence
- **PHY-018**: 80.0% confidence
- **PHY-022**: 80.0% confidence
- **PHY-024**: 80.0% confidence
- **PHY-025**: 80.0% confidence
- **PHY-026**: 80.0% confidence

### Calibration Insights

- ⚠️ **Topic Prediction Variance**: Consider refining topic allocation algorithm

### Next Steps

1. **Deploy Calibrated Parameters**: Update production engine with final parameters
2. **Generate 2026 Flagship**: Use calibrated identities to create practice papers
3. **Monitor Performance**: Track student accuracy on high-confidence identities
4. **Post-Exam Validation**: Compare 2026 actual paper with predictions

