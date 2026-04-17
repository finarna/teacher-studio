# KCET Math 2026 Flagship Generation Parameters

**Status:** ✅ Ready for Generation
**Last Updated:** 2026-04-15
**Calibration Version:** REI v16.17

---

## 🎯 UPDATED: How Difficulty Distribution is Calculated

### Discovery: Actual Paper Difficulty Trend (2021-2025)

**From Database `questions` table:**

| Year | Easy | Moderate | Hard | Total |
|------|------|----------|------|-------|
| 2021 | 38% (23) | 60% (36) | 2% (1) | 60 |
| 2022 | 52% (31) | 48% (29) | 0% (0) | 60 |
| 2023 | 38% (23) | 60% (36) | 2% (1) | 60 |
| 2024 | 47% (28) | 53% (32) | 0% (0) | 60 |
| 2025 | **70% (42)** | **30% (18)** | **0% (0)** | 60 |

### Key Finding:
- **2025 has ZERO hard questions** (70% Easy, 30% Moderate)
- **2024 also has ZERO hard questions** (47% Easy, 53% Moderate)
- **Trend: Papers are getting EASIER, not harder!**

### Calculation for 2026:

```
Step 1: Year-over-Year Drift
   rigorDrift = 2025_hard - 2024_hard
              = 0% - 0%
              = 0%

Step 2: Apply Rigor Drift Multiplier
   forecastedHard = 0 + (0 × 1.6817)
                  = 0%

Step 3: Apply Constraint (min 15%, max 65%)
   forecastedHard = max(15, min(65, 0))
                  = 15%

Step 4: Split Remaining (85%) Using KCET Ratio (33:42)
   forecastedEasy = 85 × (33/75)
                  = 85 × 0.44
                  = 37% (rounded)

   forecastedModerate = 85 - 37
                      = 48%
```

---

## 📊 FINAL 2026 DIFFICULTY DISTRIBUTION

```
✅ Easy: 37%       (22-23 questions out of 60)
✅ Moderate: 48%   (28-29 questions out of 60)
✅ Hard: 15%       (9 questions out of 60)
```

**Note:** The system applies a **minimum 15% hard constraint** to prevent papers from becoming too easy, even though actual trend shows 0% hard questions.

---

## 🔧 ENGINE PARAMETERS (Calibrated)

### Core Settings:
```
Rigor Drift Multiplier: 1.6817
IDS Baseline (Cognitive Demand): 0.8942 (89.4%)
Synthesis Weight: 0.294 (29.4%)
Trap Density Weight: 0.30
Linguistic Load: 0.25
Speed Requirement: 1.12
```

### What These Mean:

**IDS Baseline (89.4%):**
- Very high cognitive demand
- Questions require deep understanding
- Not about raw calculation difficulty, but conceptual depth

**Synthesis Weight (29.4%):**
- Property-based fusion questions
- Multi-concept integration
- Statement verification patterns

**Why High IDS but Low Hard %:**
- KCET Math emphasizes **cognitive load** (synthesis, traps) over raw difficulty
- Easy/Moderate questions can have high IDS through:
  - Property shortcuts requiring synthesis
  - Trap-heavy options
  - Multi-step logical reasoning

---

## 🎯 TOP 15 HIGH-CONFIDENCE IDENTITIES (≥75%)

### Identity Distribution for 2026:

1. **MAT-001** - Sets (99%)
2. **MAT-003** - Trigonometric Functions (99%)
3. **MAT-004** - Complex Numbers (99%)
4. **MAT-013** - Statistics (99%)
5. **MAT-014** - Probability (99%)
6. **MAT-016** - Matrices (99%) 🔥 High-yield
7. **MAT-017** - Determinants (99%)
8. **MAT-020** - Application of Derivatives (99%)
9. **MAT-022** - Integrals (99%)
10. **MAT-024** - Application of Integrals (99%)
11. **MAT-025** - Differential Equations (99%)
12. **MAT-026** - Vector Algebra (99%)
13. **MAT-029** - Linear Programming (99%)
14. **MAT-006** - Linear Inequalities (94%)
15. **MAT-010** - Straight Lines (85%)

**Total Identities:** 30
**High-Confidence:** 15 (≥75%)
**Expected in 2026:** 12-16 identities per paper

---

## 🚀 GENERATE FLAGSHIP PAPERS

### Command:
```bash
npx tsx scripts/oracle/generate_flagship_oracle.ts Math
```

### Output Files:
- `flagship_final.json` (SET A - 60 questions)
- `flagship_final_b.json` (SET B - 60 questions)

### Expected Characteristics:

**Difficulty Mix:**
- 37% Easy (~22 questions)
- 48% Moderate (~29 questions)
- 15% Hard (~9 questions)

**Key Features:**
- ✅ High IDS (89.4%) through synthesis & traps
- ✅ Property-based shortcuts (29.4% synthesis)
- ✅ Matrix/Determinant focus (MAT-016, MAT-017)
- ✅ Probability logic emphasis (MAT-014)
- ✅ Calculus applications (MAT-020, MAT-022, MAT-024)

**Board Signature:** SYNTHESIZER
- Multi-property integration
- Cross-chapter connections
- Logical reasoning chains

---

## 📈 HISTORICAL EVOLUTION (2021-2025)

### IDS Trend:
```
2021: 0.74 (ANCHOR)
2022: 0.74 (SYNTHESIZER)
2023: 0.76 (SYNTHESIZER)
2024: 0.68 (LOGICIAN)
2025: 0.79 (SYNTHESIZER)
2026: 0.89 (Predicted - SYNTHESIZER)
```

### Identity Count Trend:
```
2021: 12 identities
2022: 12 identities
2023: 12 identities
2024: 15 identities
2025: 16 identities
2026: 12-16 identities (Predicted)
```

### Synthesis Emphasis Trend:
```
2021: 0.5 (50%)
2022-2023: 0.8 (80%)
2024: 0.6 (60%)
2025: 0.8 (80%)
2026: 0.294 (29.4% - Calibrated optimal)
```

---

## 🔑 KEY INSIGHTS

### 1. **Difficulty ≠ IDS**
- Papers are getting easier in difficulty rating (more Easy questions)
- But IDS is increasing (higher cognitive demand)
- This means: **Easier problems with harder concepts**

### 2. **Synthesis Over Calculation**
- KCET Math rewards **property-based shortcuts**
- Not about lengthy calculations
- Focus on **conceptual understanding** and **pattern recognition**

### 3. **High-Yield Topics**
Top 3 most important:
1. **Matrices & Determinants** (MAT-016, MAT-017)
2. **Probability** (MAT-014)
3. **Calculus Applications** (MAT-020, MAT-022, MAT-024)

### 4. **2026 Prediction Confidence**
- Identity Hit Rate: 79.2% (calibrated)
- System Confidence: 66.4% (fair)
- Limiting factor: Topic accuracy at 50%

---

## 📊 UPDATES MADE

### 1. ✅ Calibration Script Enhanced
**File:** `docs/oracle/calibration/scripts/kcet_math_iterative_calibration_2021_2025.ts`

**New Features:**
- Automatically calculates difficulty distribution from actual papers
- Stores `difficulty_easy_pct`, `difficulty_moderate_pct`, `difficulty_hard_pct` in database
- Enables trend detection for future calibrations

### 2. ✅ Database Updated
**Tables:** `exam_historical_patterns`

**Added Fields:**
- `difficulty_easy_pct` (2021-2025)
- `difficulty_moderate_pct` (2021-2025)
- `difficulty_hard_pct` (2021-2025)

### 3. ✅ Bug Fixed
**File:** `lib/reiEvolutionEngine.ts`

**Fix:** Changed `||` to `??` (nullish coalescing)
- Before: `difficulty_hard_pct || 20` treated 0% as 20%
- After: `difficulty_hard_pct ?? 20` treats 0% correctly

---

## 🎯 READY TO GENERATE!

All parameters are calibrated and validated. The system is ready to generate flagship papers for KCET Math 2026.

### Quick Checklist:
- ✅ Engine parameters calibrated (rigor, IDS, synthesis)
- ✅ Identity bank updated (15 high-confidence)
- ✅ Difficulty distribution calculated (37/48/15)
- ✅ Historical patterns stored (2021-2025)
- ✅ Database tables synchronized
- ✅ Bug fixes applied

**Run:** `npx tsx scripts/oracle/generate_flagship_oracle.ts Math`

---

**Document Version:** 1.0
**Author:** REI Calibration System
**Calibration Date:** 2026-04-14
**Parameters Updated:** 2026-04-15
