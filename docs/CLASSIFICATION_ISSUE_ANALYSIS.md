# Classification Issue Analysis - All Questions Showing as "General"

## Date
2026-01-30

## Problem

All questions are being classified as "General" instead of proper domains like "Algebra", "Calculus", "Vectors & 3D", etc.

**Console output**:
```
🔍 [CLASSIFICATION DEBUG] Q1: topic="Mathematics" → matched="General"
🔍 [CLASSIFICATION DEBUG] Q2: topic="Mathematics" → matched="General"
🔍 [CLASSIFICATION DEBUG] Q3: topic="Mathematics" → matched="General"
📊 [CLASSIFICATION SUMMARY] Subject: Math, Distribution: {General: 60}
```

## Root Cause

The `topic` field in extracted questions contains **"Mathematics"** (the subject name) instead of specific mathematical topics.

### Expected vs Actual

**Expected topic values**:
- "Differential Equations"
- "Integration"
- "Matrices"
- "Determinants"
- "Probability"
- "Vectors"
- "3D Geometry"
- etc.

**Actual topic values**:
- "Mathematics" (for ALL questions)

## Why This Happens

The question extraction system (`utils/simpleMathExtractor.ts`) is setting the `topic` field incorrectly.

**Current extraction schema** (lines 109-113):
```typescript
{
  type: Type.OBJECT,
  properties: {
    id: { type: Type.INTEGER, description: "The question number" },
    text: { type: Type.STRING, description: "The question text with LaTeX" },
    options: { ... },
    domain: { type: Type.STRING, description: "Major domain: Algebra, Calculus, ..." },
    chapter: { type: Type.STRING, description: "Specific NCERT/KCET chapter name" },
    topic: { type: Type.STRING, description: "Specific sub-topic" },  // ← This is the field
    difficulty: { ... },
    blooms: { ... },
  }
}
```

**The issue**: The AI is likely filling `topic` with the generic subject name rather than the specific mathematical topic from the question.

## Classification Logic

**File**: `components/ExamAnalysis.tsx` (lines 290-329)

The classification function `classifyQuestionToDomainKey` works like this:

1. Takes `question.topic` (e.g., "Differential Equations")
2. Converts to lowercase: "differential equations"
3. Tries to match against domain keywords (chapters list)
4. Returns matched domain key or "General"

**Example matching**:
```typescript
Domain: "Calculus 2"
Keywords: ["Integrals", "Definite Integration", "Differential Equations", ...]

Topic: "Differential Equations"
Match: ✅ Found in keywords → Returns "Calculus 2"

Topic: "Mathematics"
Match: ❌ Not found in any keywords → Returns "General"
```

## Where Topic Should Come From

The `topic` field should be populated from the **question extraction AI prompt**.

**Current prompt** (lines 72-87 in `simpleMathExtractor.ts`):
```
CRITICAL INSTRUCTIONS FOR CLASSIFICATION:
Classify each question into the NCERT/KCET Class 12 Mathematics curriculum:

DOMAINS & CHAPTERS (Use these exact domain names):
- Algebra: Relations and Functions, Inverse Trigonometric Functions, Matrices, Determinants, ...
- Calculus: Integrals, Indefinite Integration, Definite Integration, Differential Equations, ...
- Vectors & 3D: Vectors, Scalar and Vector Products, Three Dimensional Geometry, ...
- Linear Programming: Linear Programming Problems, Optimization, ...
- Probability: Probability, Conditional Probability, Bayes Theorem, ...

For each question:
- Set "domain" to one of: Algebra, Calculus, Vectors & 3D, Linear Programming, Probability
- Set "chapter" to the most specific chapter from the list above
- Set "topic" to a more specific sub-topic that will help with classification
```

**The AI is setting**:
- `domain`: "Algebra" ✅ (correct)
- `chapter`: "Differential Equations" ✅ (correct)
- `topic`: "Mathematics" ❌ (wrong - should be specific like "Variable Separable Method")

## Solution

### Option 1: Use `chapter` Instead of `topic`

The `chapter` field seems to be correctly populated. Update classification to use it.

**Change in ExamAnalysis.tsx** (line 292):
```typescript
// Before:
const topic = (question.topic || '').toLowerCase().trim();

// After:
const topic = (question.chapter || question.topic || '').toLowerCase().trim();
```

**Benefit**: Immediate fix, works with current data

### Option 2: Fix Extraction Prompt

Make the prompt clearer about what goes in each field.

**Change in simpleMathExtractor.ts** (around line 82):
```
For each question:
- Set "domain" to one of: Algebra, Calculus, Vectors & 3D, Linear Programming, Probability
- Set "chapter" to the most specific chapter from the list above (e.g., "Differential Equations", "Matrices")
- Set "topic" to the chapter name (same as chapter field) for classification purposes
- Set "difficulty" to one of: Easy, Moderate, Hard
```

**Benefit**: Fixes at source, ensures `topic` is always useful

### Option 3: Use Both Fields

Combine `chapter` and `topic` for better classification.

**Change in ExamAnalysis.tsx**:
```typescript
const topic = `${question.chapter || ''} ${question.topic || ''}`.toLowerCase().trim();
```

**Benefit**: More comprehensive matching

## Recommended Fix

**Use Option 1** (immediate fix) + **Option 2** (long-term fix)

### Step 1: Update ExamAnalysis Classification (Immediate)

**File**: `components/ExamAnalysis.tsx`
**Line**: 292

```typescript
// IMMEDIATE FIX: Use chapter field for classification
const topic = (question.chapter || question.topic || '').toLowerCase().trim();
```

**Why**: The `chapter` field likely contains correct values like "Differential Equations", "Matrices", etc.

### Step 2: Improve Extraction Prompt (Long-term)

**File**: `utils/simpleMathExtractor.ts`
**Lines**: 82-87

```typescript
For each question:
- Set "domain" to one of: Algebra, Calculus, Vectors & 3D, Linear Programming, Probability
- Set "chapter" to the most specific chapter from the list above (e.g., "Differential Equations", "Matrices")
- Set "topic" to the same value as chapter (copy the chapter name here for classification)
- Set "difficulty" to one of: Easy, Moderate, Hard (based on complexity)
- Set "blooms" to one of: Remember, Understand, Apply, Analyze, Evaluate, Create
```

**Why**: Makes it explicit that `topic` should match `chapter` for classification purposes

## Testing

After applying Option 1 fix:

**Expected console output**:
```
🔍 [CLASSIFICATION DEBUG] Q1: topic="Differential Equations" → matched="Calculus 2"
🔍 [CLASSIFICATION DEBUG] Q2: topic="Matrices" → matched="Algebra"
🔍 [CLASSIFICATION DEBUG] Q3: topic="Vectors" → matched="Vectors & 3D"
📊 [CLASSIFICATION SUMMARY] Subject: Math, Distribution: {
  "Algebra": 15,
  "Calculus 1": 12,
  "Calculus 2": 18,
  "Vectors & 3D": 10,
  "Probability": 5
}
```

## Impact

**Current state (all "General")**:
- ❌ Domain insights useless
- ❌ Chapter breakdown incorrect
- ❌ Study recommendations generic
- ❌ Vault grouping fails
- ❌ Analytics misleading

**After fix**:
- ✅ Correct domain classification
- ✅ Accurate chapter insights
- ✅ Specific study recommendations
- ✅ Proper vault organization
- ✅ Meaningful analytics

## Files to Modify

1. **`components/ExamAnalysis.tsx`** (line 292):
   ```typescript
   const topic = (question.chapter || question.topic || '').toLowerCase().trim();
   ```

2. **`utils/simpleMathExtractor.ts`** (lines 82-87):
   ```
   - Set "topic" to the same value as chapter (copy the chapter name here for classification)
   ```

---

**Status**: 🔍 Analysis Complete, Fix Ready
**Priority**: High - affects all domain-based features
**Effort**: 5 minutes (one-line change for immediate fix)
**Testing**: Re-upload exam paper, check console for correct classification
