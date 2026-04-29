# Calibration Scripts Comparison: KCET Math vs NEET Physics

## Overview

This document provides a side-by-side comparison of the two calibration scripts to highlight the key differences and design decisions.

## Configuration Comparison

| Parameter | KCET Math | NEET Physics | Notes |
|-----------|-----------|--------------|-------|
| **Exam Context** | `'KCET'` | `'NEET'` | Different exam boards |
| **Subject** | `'Math'` | `'Physics'` | Different subjects |
| **Total Questions** | `60` | `50` | NEET has 50 Physics questions vs KCET's 60 Math |
| **Duration** | 80 mins | 180 mins | NEET is full-length exam |
| **Marks per Question** | 1 | 4 | NEET has higher weightage |
| **Total Marks** | 60 | 180 (50×4) | Different scoring systems |
| **Target Match Rate** | 80% | 80% | Same quality threshold |
| **Max Iterations** | 10 | 10 | Same optimization budget |

## Data Source Comparison

### KCET Math - Dedicated Subject Scans

```typescript
const OFFICIAL_SCANS: Record<number, string> = {
  2021: 'eba5ed94-dde7-4171-80ff-aecbf0c969f7',  // Dedicated Math scan
  2022: '0899f3e1-9980-48f4-9caa-91c65de53830',  // Dedicated Math scan
  2023: 'eeed39eb-6ffe-4aaa-b752-b3139b311e6d',  // Dedicated Math scan
  2024: '7019df69-f2e2-4464-afbb-cc56698cb8e9',  // Dedicated Math scan
  2025: 'c202f81d-cc53-40b1-a473-8f621faac5ba'   // Dedicated Math scan
};
```

**Query**: No subject filter needed (scan is already Math-only)

### NEET Physics - Combined Papers with Subject Filter

```typescript
const OFFICIAL_SCANS: Record<number, string> = {
  2021: 'ca38a537-5516-469a-abd4-967a76b32028',  // Combined paper
  2022: 'b19037fb-980a-41e1-89a0-d28a5e1c0033',  // Combined paper
  2023: 'e3767338-1664-4e03-b0f6-1fab41ff5838',  // Combined paper
  2024: '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5',  // Combined paper
  2025: '4f682118-d0ce-4f6f-95c7-6141e496579f'   // Combined paper
};
```

**Query**: MUST include `.eq('subject', 'Physics')` filter

## Identity Bank Structure Comparison

### KCET Math Identity

```json
{
  "id": "ID-M-001",
  "topic": "Vectors in 3D Space",
  "logic": "Questions involving cross products, dot products, and triple products.",
  "high_yield": true,
  "confidence": 0.92
}
```

**Access**: `identity.topic` (uses `topic` field)

### NEET Physics Identity

```json
{
  "id": "ID-NP-001",
  "name": "Dimensional Homogeneity Traps",
  "logic": "Predicting the dimensions of obscure constants like Stefan's constant...",
  "high_yield": true,
  "confidence": 0.98
}
```

**Access**: `identity.name` (uses `name` field)

## Code Differences

### 1. Identity Bank Path

**KCET Math**:
```typescript
const identityBankPath = path.join(
  process.cwd(),
  `lib/oracle/identities/kcet_${SUBJECT.toLowerCase()}.json`
);
// Results in: lib/oracle/identities/kcet_math.json
```

**NEET Physics**:
```typescript
const identityBankPath = path.join(
  process.cwd(),
  'lib/oracle/identities/neet_physics.json'
);
// Hardcoded path to avoid case-sensitivity issues
```

### 2. Database Query (Baseline Extraction)

**KCET Math**:
```typescript
const { data: questions } = await supabase
  .from('questions')
  .select('text, topic, difficulty, options, correct_option_index, solution_steps')
  .eq('scan_id', OFFICIAL_SCANS[2021])
  .order('question_order');
// No subject filter - scan is already Math-only
```

**NEET Physics**:
```typescript
const { data: questions } = await supabase
  .from('questions')
  .select('text, topic, difficulty, options, correct_option_index, solution_steps, subject')
  .eq('scan_id', OFFICIAL_SCANS[2021])
  .eq('subject', 'Physics')  // CRITICAL: Filter for Physics only
  .order('question_order');
```

### 3. Identity Matching Logic

**KCET Math**:
```typescript
const matchingIdentities = identities.filter(
  (id) => id.topic.toLowerCase() === topic.toLowerCase()
);
```

**NEET Physics**:
```typescript
const matchingIdentities = identities.filter(
  (id) => id.name.toLowerCase() === topic.toLowerCase()
);
```

### 4. Generation Context - Topic Metadata

**KCET Math**:
```typescript
const topics = identities.map((id, idx) => ({
  topicId: id.id,
  topicName: id.topic,  // Uses 'topic' field
  syllabus: id.logic || id.name,
  bloomsLevels: ['Apply', 'Analyze'],
  estimatedDifficulty: 5,
  prerequisites: []
}));
```

**NEET Physics**:
```typescript
const topics = identities.map((id, idx) => ({
  topicId: id.id,
  topicName: id.name,   // Uses 'name' field
  syllabus: id.logic || id.name,
  bloomsLevels: ['Apply', 'Analyze'],
  estimatedDifficulty: 5,
  prerequisites: []
}));
```

### 5. Output File Names

**KCET Math**:
```typescript
const reportPath = path.join(outputDir, 'KCET_MATH_CALIBRATION_REPORT_2021_2025.md');
const updatedEngineConfigPath = path.join(outputDir, 'engine_config_calibrated.json');
```

**NEET Physics**:
```typescript
const reportPath = path.join(outputDir, 'NEET_PHYSICS_CALIBRATION_REPORT_2021_2025.md');
const updatedEngineConfigPath = path.join(outputDir, 'engine_config_calibrated_neet_physics.json');
```

### 6. Calibration Note

**KCET Math**:
```typescript
calibration_note: 'Calibrated using iterative RWC (2021-2025)'
```

**NEET Physics**:
```typescript
calibration_note: 'Calibrated using iterative RWC (2021-2025) - NEET Physics'
```

## Critical Implementation Details

### Subject Filtering (NEET Physics Only)

NEET papers contain all subjects (Physics, Chemistry, Biology). The NEET Physics script MUST filter for Physics questions in TWO places:

1. **Baseline Extraction** (line 254-255):
```typescript
.eq('scan_id', OFFICIAL_SCANS[2021])
.eq('subject', 'Physics')  // MUST have this
```

2. **Year Calibration** (line 304-305):
```typescript
.eq('scan_id', OFFICIAL_SCANS[year])
.eq('subject', 'Physics')  // MUST have this
```

**Without this filter**, the script would fetch all 200 questions (Physics + Chemistry + Biology) instead of just the 50 Physics questions.

### Identity Field Consistency

All references to the identity field must be consistent:

**KCET Math uses `topic`**:
- Line 600: `id.topic.toLowerCase()`
- Line 616: `id.topic.toLowerCase()`
- Line 493: `topicName: id.topic`

**NEET Physics uses `name`**:
- Line 605: `id.name.toLowerCase()`
- Line 621: `id.name.toLowerCase()`
- Line 498: `topicName: id.name`

## Validation Checklist

When adapting calibration for a new exam/subject, verify:

- [ ] `EXAM_CONTEXT` is correct
- [ ] `SUBJECT` is correct
- [ ] `TOTAL_QUESTIONS` matches actual paper
- [ ] Scan IDs are valid and accessible
- [ ] Subject filter applied if using combined papers
- [ ] Identity field name is correct (`topic` vs `name`)
- [ ] All identity references use correct field
- [ ] Output file names are unique
- [ ] Marks per question is correct
- [ ] Duration is correct

## Performance Expectations

Based on KCET Math calibration experience:

| Metric | Expected Range | Target |
|--------|---------------|--------|
| Match Rate (Year 1) | 40-60% | 80%+ by end |
| Match Rate (Final) | 75-90% | 80%+ |
| Iterations per Year | 3-8 | <10 |
| Total Runtime | 2-4 hours | - |
| Identity Expansion | 5→100+ | 180+ |

## Common Pitfalls

### 1. Forgetting Subject Filter (NEET)
```typescript
// ❌ WRONG - Will fetch all 200 questions
.eq('scan_id', OFFICIAL_SCANS[year])

// ✅ CORRECT - Fetches only 50 Physics questions
.eq('scan_id', OFFICIAL_SCANS[year])
.eq('subject', 'Physics')
```

### 2. Mixed Identity Field Names
```typescript
// ❌ WRONG - Inconsistent field access
topicName: id.topic,  // Line 100
...
id.name.toLowerCase() // Line 200

// ✅ CORRECT - Consistent field access
topicName: id.name,   // Line 100
...
id.name.toLowerCase() // Line 200
```

### 3. Wrong Question Count
```typescript
// ❌ WRONG - NEET has 50, not 60
const TOTAL_QUESTIONS = 60;

// ✅ CORRECT
const TOTAL_QUESTIONS = 50;
```

## Lessons Learned

1. **Always validate setup first**: Run validation script before calibration
2. **Subject filtering is critical**: NEET requires explicit filtering
3. **Identity field naming matters**: Must be consistent throughout
4. **Scan IDs must be verified**: Different exams have different structures
5. **Question counts vary**: Don't assume same structure across exams

## Future Adaptations

When creating new calibration scripts (e.g., NEET Chemistry, JEE Physics), use this checklist:

1. Copy appropriate template (dedicated vs combined papers)
2. Update all configuration constants
3. Verify scan IDs exist and are accessible
4. Check identity bank structure and field names
5. Add subject filter if needed
6. Update output file names
7. Run validation script
8. Test with single year first
9. Run full calibration
10. Review and document results

## Conclusion

The NEET Physics calibration script successfully adapts the KCET Math methodology by:
- Adjusting for 50 questions instead of 60
- Adding subject filtering for combined papers
- Using `name` field instead of `topic` for identities
- Maintaining all core calibration logic

Both scripts share the same robust calibration algorithm while accommodating exam-specific differences in data structure and question counts.
