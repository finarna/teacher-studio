# NEET Phase 5: Generator Setup - Verification Template

**Workflow Step:** Phase 5, Step 5.3 - Test Generator
**Applies to:** All NEET subjects (Physics, Chemistry, Botany, Zoology)
**Created:** 2026-04-29

---

## Purpose

This document serves as the verification checklist for Phase 5 Step 5.3 of the NEET Repeatable Calibration Workflow. Use this template to verify that the generator is correctly configured before proceeding to Phase 6 (Flagship Generation).

---

## Verification Checklist

### Step 5.1: Generator Script Exists ✅

- [ ] Script exists: `scripts/oracle/phase_generate_flagship_neet.ts`
- [ ] Script is generic (works for all 4 NEET subjects)
- [ ] Valid subjects defined: `['Physics', 'Chemistry', 'Botany', 'Zoology']`

### Step 5.2: Generator Customization ✅

- [ ] Exam constant: `const exam = 'NEET'`
- [ ] Question count: `const NEET_QUESTIONS_PER_SET = 45`
- [ ] Loads question type analysis from `docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_${SUBJECT}.json`
- [ ] Loads identity bank from `lib/oracle/identities/neet_${subject}.json`
- [ ] Extracts high-yield identities (top 10)
- [ ] Queries database for `target_year: 2026`
- [ ] Uses `getForecastedCalibration()` to load calibration

### Step 5.2b: NEET Question Type Distribution Directives ✅

- [ ] MCQ format directive: "All questions use MCQ answer format (4 options, single correct)"
- [ ] "GENERATE EXACTLY X questions" directives for each question type
- [ ] Question type guidelines included:
  - SIMPLE_RECALL_MCQ
  - DIAGRAM_BASED_MCQ
  - MATCH_FOLLOWING_MCQ
  - CALCULATION_MCQ
  - DEFINITIONAL_MCQ
  - ASSERTION_REASON_MCQ (if applicable)
  - STATEMENT_BASED_MCQ (if applicable)
- [ ] Total directives: ~50 (varies by subject)

### Step 5.3: Test Generator (Dry Run) ✅

Run the generator in dry-run mode:
```bash
npx tsx scripts/oracle/phase_generate_flagship_neet.ts <Subject>
```

Verify the output shows:

**Prerequisites Check:**
- [ ] Phase 4 complete: Calibration found in database
- [ ] IDS Target loaded
- [ ] Difficulty loaded (Easy/Moderate/Hard percentages)
- [ ] Identity bank loaded (21+ identities)
- [ ] Question type analysis loaded (245+ questions)

**Calibration Data Loaded:**
- [ ] Forecast IDS Target matches database
- [ ] Forecast Rigor Velocity matches database
- [ ] Difficulty Mix matches database (NOT baseline fallback)
- [ ] Board Signature matches database

**High-Yield Identities:**
- [ ] Top 10 identities loaded
- [ ] Identities sorted by avgPerYear (descending)

**Question Type Distribution:**
- [ ] Question counts calculated for 45 questions
- [ ] Percentages match historical analysis
- [ ] Sum of question counts = 45

**Configuration Summary:**
- [ ] Subject: Correct
- [ ] Exam: NEET
- [ ] Questions per set: 45
- [ ] IDS Target: Matches Phase 4
- [ ] Difficulty: Matches Phase 4 (not 30/50/20 baseline!)
- [ ] High-yield identities: 10
- [ ] Directives: ~50

---

## Cross-Check: Filesystem vs Database vs Generator

Run this verification to ensure all three sources match:

| Parameter | Filesystem | Database | Generator | Status |
|-----------|------------|----------|-----------|--------|
| Target Year | 2026 | 2026 | 2026 | ✅ |
| IDS Target | (from engine_config) | (from intent_signature) | (from forecast) | ✅ |
| Rigor Velocity | (from engine_config) | (from rigor_velocity) | (from forecast) | ✅ |
| Board Signature | (from engine_config) | (from board_signature) | (from forecast) | ✅ |
| Difficulty Easy % | (from engine_config) | (from intent_signature) | (from forecast) | ✅ |
| Difficulty Moderate % | (from engine_config) | (from intent_signature) | (from forecast) | ✅ |
| Difficulty Hard % | (from engine_config) | (from intent_signature) | (from forecast) | ✅ |
| Questions per set | 45 | N/A | 45 | ✅ |

**Commands to verify:**

```bash
# Filesystem
cat docs/oracle/calibration/engine_config_calibrated_neet_${subject}.json | jq

# Database
npx tsx scripts/oracle/check_actual_neet_calibrations_in_db.ts

# Generator
npx tsx scripts/oracle/phase_generate_flagship_neet.ts ${Subject}
```

---

## NEET 2026 Format Alignment

- [ ] 45 questions per subject (NOT 50)
- [ ] All compulsory (NO Section A/B split)
- [ ] Duration: 200 minutes
- [ ] Marking scheme: +4 correct, -1 incorrect
- [ ] Syllabus file updated: `syllabi/NEET_2026_Syllabus.md`

---

## Subject-Specific Values

Record the verified values for this subject:

**Subject:** _________________

**Filesystem (engine_config_calibrated_neet_${subject}.json):**
- IDS Baseline: __________
- Rigor Drift Multiplier: __________
- Board Signature: __________
- Difficulty: _____/_____/_____ (Easy/Moderate/Hard)
- Question Type Profile: (JSON object)

**Database (ai_universal_calibration):**
- Target Year: __________
- IDS Target: __________
- Rigor Velocity: __________
- Board Signature: __________
- Difficulty: _____/_____/_____ (Easy/Moderate/Hard)

**Generator Output:**
- IDS Target: __________
- Rigor Velocity: __________
- Board Signature: __________
- Difficulty: _____/_____/_____ (Easy/Moderate/Hard)
- Questions per set: __________
- Directives count: __________

**Question Type Distribution (for 45 questions):**
- simple_recall_mcq: _____ questions (_____%)
- diagram_based_mcq: _____ questions (_____%)
- calculation_mcq: _____ questions (_____%)
- definitional_mcq: _____ questions (_____%)
- match_following_mcq: _____ questions (_____%)
- assertion_reason_mcq: _____ questions (_____%)
- statement_based_mcq: _____ questions (_____%)
- Other: _____ questions (_____%)

**High-Yield Topics (Top 5):**
1. __________: _____ Q/year
2. __________: _____ Q/year
3. __________: _____ Q/year
4. __________: _____ Q/year
5. __________: _____ Q/year

---

## Sign-off

- [ ] All checks passed
- [ ] All values match across filesystem, database, and generator
- [ ] Generator ready for Phase 6 (Flagship Generation)

**Verified by:** __________
**Date:** __________
**Subject:** __________

**Next Command:**
```bash
npx tsx scripts/oracle/phase_generate_flagship_neet.ts ${Subject} --generate
```

---

## Common Issues and Fixes

### Issue: Difficulty shows 30/50/20 (baseline) instead of actual values

**Cause:** `getForecastedCalibration()` loading from fallback baseline instead of database

**Fix:** Ensure `intent_signature.difficultyProfile` exists in database:
```typescript
intent_signature: {
  difficultyEasyPct: 20,
  difficultyModeratePct: 71,
  difficultyHardPct: 9,
  difficultyProfile: {    // Must have this!
    easy: 20,
    moderate: 71,
    hard: 9
  }
}
```

### Issue: Generator queries wrong year (2027 instead of 2026)

**Fix:** Update generator to query `target_year: 2026`:
```typescript
.eq('target_year', 2026)
```

### Issue: Questions per set shows 50 instead of 45

**Fix:** Verify NEET_QUESTIONS_PER_SET constant and NEET 2026 syllabus file

---

## References

- Workflow: `docs/oracle/REPEATABLE_CALIBRATION_WORKFLOW.md` (Phase 5)
- Generator: `scripts/oracle/phase_generate_flagship_neet.ts`
- Syllabus: `syllabi/NEET_2026_Syllabus.md`
- Database table: `ai_universal_calibration`
