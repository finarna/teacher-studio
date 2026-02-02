# Physics Clean Prompt Trial - Implementation Summary

**Date**: 2026-02-02
**Status**: ✅ Implemented - Ready for Testing
**Type**: Temporary Trial (Compare vs Lengthy Prompt)

## Overview

Replaced lengthy, patchy Physics extraction prompts (230+ lines) with a clean, concise approach modeled after Math extraction system (~240 lines, better organized).

## Recent Fixes (2026-02-02 18:30)

### Fixed Issue 1: Missing Backslash in \times
- **Problem**: LaTeX showing "ximes" instead of "×" (missing backslash)
- **Fix**: Added emphatic warnings about `\times` requiring backslash
- **Location**: `cleanPhysicsExtractor.ts` lines 91-99

### Fixed Issue 2: Temperature Notation KaTeX Errors
- **Problem**: `$20\,^\circ\text{C}$` causing KaTeX parse errors
- **Fix**: Changed to `$20^\circ\text{C}$` (NO thin space before degree symbol)
- **Location**: `cleanPhysicsExtractor.ts` lines 86, 190

### Fixed Issue 3: Missing Visual Element Detection
- **Problem**: New prompt wasn't detecting circuit diagrams, ray diagrams, etc.
- **Fix**: Added comprehensive visual detection instructions (Step 6)
- **Details**: Detects circuit-diagram, ray-diagram, free-body-diagram, wave-diagram, field-diagram, energy-level-diagram
- **Location**: `cleanPhysicsExtractor.ts` lines 150-181

## Changes Made

### 1. Created New File: `utils/cleanPhysicsExtractor.ts`

**Structure** (similar to `cleanMathExtractor.ts`):
- **Role & Expertise** - Sets context for AI
- **Critical Space Preservation** - Prevents scrambled text like "Asmalltelescopehas"
- **Step-by-Step Methodology** - Clear extraction process
- **Physics Notation Sections**:
  - 3A. Vectors (bold/arrow notation): `**F**` → `$\mathbf{F}$`
  - 3B. Subscripts/superscripts: `v₀` → `$v_0$`, `m²` → `$\text{m}^2$`
  - 3C. Units with spacing: `10 m/s` → `$10\,\text{m/s}$`
  - 3D. Scientific notation: `3 × 10⁸` → `$3 \times 10^8$`
  - 3E. Greek letters: `θ` → `$\theta$`, `λ` → `$\lambda$`
  - 3F. Fractions/equations: `1/2 mv²` → `$\frac{1}{2}mv^2$`
  - 3G. Special symbols: `∝` → `$\propto$`, `≈` → `$\approx$`
- **Output Format** - Strict JSON schema
- **Quality Checklist** - Pre-submission validation
- **Complete Examples** - Right/wrong comparisons

**Key Features**:
- ✅ Concise and focused (vs 230-line patchy reference)
- ✅ Professional tone and structure
- ✅ Real-world Physics examples
- ✅ Space preservation emphasis
- ✅ Double backslash LaTeX (proper JSON escaping)
- ✅ Validation function included

### 2. Updated `components/BoardMastermind.tsx`

**Import Added** (line 26):
```typescript
import { generateCleanPhysicsPrompt } from '../utils/cleanPhysicsExtractor';
```

**Three Locations Updated**:

#### Location 1: Bulk File Upload (lines 148-152)
```typescript
const extractionPrompt = selectedSubject === 'Math'
  ? generateCleanMathPrompt(selectedGrade)
  : selectedSubject === 'Physics'
  ? generateCleanPhysicsPrompt(selectedGrade)  // ← NEW
  : `Extract ALL questions verbatim...`;
```

#### Location 2: Single File Upload (lines 465-469)
```typescript
const extractionPrompt = selectedSubject === 'Math'
  ? generateCleanMathPrompt(selectedGrade)
  : selectedSubject === 'Physics'
  ? generateCleanPhysicsPrompt(selectedGrade)  // ← NEW
  : `Extract ALL questions verbatim...`;
```

#### Location 3: Multi-Pass Extraction (lines 675-686)
```typescript
const remainingPrompt = selectedSubject === 'Math'
  ? generateCleanMathPrompt(selectedGrade) + `\n\n🚨 CRITICAL: PASS ${passNumber}...`
  : selectedSubject === 'Physics'
  ? generateCleanPhysicsPrompt(selectedGrade) + `\n\n🚨 CRITICAL: PASS ${passNumber}...`  // ← NEW
  : `Extract ALL remaining questions...`;
```

## What Changed

### Before (Old System)
- Used `generatePhysicsExtractionInstructions()` from `physicsNotationReference.ts`
- 230+ lines of reference material
- Embedded in larger prompt with many rules
- Physics notation buried in lengthy text

### After (New System)
- Uses `generateCleanPhysicsPrompt(grade)` from `cleanPhysicsExtractor.ts`
- ~200 lines, better organized
- Standalone focused prompt
- Clear sections with examples
- Professional structure matching Math approach

## Testing Plan

### Prerequisites
1. ✅ Backend running on port 9001
2. ✅ Frontend running on port 9003
3. ✅ Database fixes applied (difficulty normalization, UUID generation)

### Test Steps

#### Test 1: Fresh Physics PDF Upload
1. Upload a Class 12 Physics exam paper (PDF)
2. Check extracted questions for:
   - ✅ **Space preservation**: No "Asmalltelescopehas" merging
   - ✅ **Vector notation**: Bold/arrow vectors properly converted
   - ✅ **Units**: Proper spacing like `$10\,\text{m/s}$`
   - ✅ **Greek letters**: `$\theta$`, `$\lambda$`, `$\omega$` with double backslash
   - ✅ **Scientific notation**: `$3 \times 10^8$` not `3 x 10^8`
   - ✅ **No KaTeX errors**: Check console for parse errors

#### Test 2: Compare Old vs New Data
- **Old scans** (created before this fix): May have scrambled text, single backslash LaTeX
- **New scans** (created after this fix): Should have proper spacing and double backslash LaTeX

#### Test 3: Database Verification
```bash
# Check questions saved successfully
npx tsx scripts/list-scans.ts
```

Expected output:
- Scan shows question count > 0
- No foreign key errors
- No difficulty constraint errors

### Success Criteria

✅ **Pass if**:
- Questions extracted with proper word spacing
- LaTeX renders correctly (no KaTeX parse errors)
- Units formatted with proper spacing: `$10\,\text{m/s}$`
- Greek letters render: θ, λ, ω, etc.
- Vectors properly formatted: **F** → $\mathbf{F}$
- Questions save to database successfully

❌ **Fail if**:
- Text still scrambled: "Asmalltelescopehas"
- KaTeX errors: `{expression: '\theta'}` (single backslash)
- Units without spacing: `10m/s` instead of `$10\,\text{m/s}$`
- Questions don't save (constraint errors)

## Rollback Plan

If new prompt performs worse:

```typescript
// In BoardMastermind.tsx, revert to:
const extractionPrompt = selectedSubject === 'Math'
  ? generateCleanMathPrompt(selectedGrade)
  : `Extract ALL questions verbatim from this ${selectedSubject} paper.
    ...
    ${selectedSubject === 'Physics' ? `3. CRITICAL PHYSICS NOTATION - READ CAREFULLY:
    ${generatePhysicsExtractionInstructions()}
    ` : ''}...`;
```

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `utils/cleanPhysicsExtractor.ts` | NEW (212 lines) | Clean Physics prompt generator |
| `components/BoardMastermind.tsx` | 26, 150-152, 467-469, 681-686 | Import and use new prompt |

## Files Unchanged (Old System)

| File | Status | Notes |
|------|--------|-------|
| `utils/physicsNotationReference.ts` | Preserved | Keep for potential rollback |
| `utils/simpleMathExtractor.ts` | Unchanged | Math-specific, no changes needed |

## Next Steps

1. ✅ **Done**: Implementation complete
2. ⏳ **Pending**: Test with fresh Physics PDF upload
3. ⏳ **Pending**: Verify extraction quality
4. ⏳ **Pending**: Compare prompt effectiveness
5. ⏳ **Decision**: Keep clean prompt or rollback based on results

## Technical Details

### LaTeX Escaping
- Prompt uses **double backslashes**: `\\theta`, `\\lambda`
- JSON parsing removes one level → becomes single backslash
- KaTeX receives correct single backslash: `\theta`, `\lambda`
- Renders correctly: θ, λ

### Space Preservation
Emphasized in multiple sections:
- Critical warning at top with examples
- Step 2 methodology
- Quality checklist
- Complete examples section

### Validation
Included `validatePhysicsQuestion()` function:
- Checks for merged words (15+ chars without space)
- Validates option format (A, B, C, D)
- Ensures required fields present
- Verifies difficulty values match DB constraint

## Comparison: Old vs New

| Aspect | Old System | New System |
|--------|------------|------------|
| **File** | `physicsNotationReference.ts` | `cleanPhysicsExtractor.ts` |
| **Lines** | 243 lines | 212 lines |
| **Structure** | Single text block | Organized sections |
| **Examples** | Mixed throughout | Dedicated examples section |
| **Tone** | Technical reference | Professional educator |
| **Focus** | Comprehensive coverage | Essential notation only |
| **Integration** | Embedded in larger prompt | Standalone focused prompt |
| **Validation** | None | Included validation function |

## Related Issues Fixed

1. ✅ Scrambled text without spaces
2. ✅ Single backslash LaTeX (KaTeX errors)
3. ✅ Difficulty constraint violations
4. ✅ Foreign key constraint violations
5. ✅ UUID format errors

## Documentation

- This document: Trial implementation summary
- `SUPABASE_SETUP_GUIDE.md`: Database setup
- `MIGRATION_STATUS.md`: Migration history
- Related docs in `/docs/` folder

---

**Trial Status**: Ready for user testing
**Expected Outcome**: Cleaner, more reliable Physics extraction
**Fallback**: Old system preserved, can rollback if needed
