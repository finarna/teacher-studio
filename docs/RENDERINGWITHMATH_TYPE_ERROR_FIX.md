# RenderWithMath Type Error Fix

## Date
2026-01-30

## Problem

**Runtime TypeError**: `text.replace is not a function at RenderWithMath (MathRenderer.tsx:177)`

### Error Details
```
Uncaught TypeError: text.replace is not a function
    at RenderWithMath (MathRenderer.tsx:177:6)
```

### Root Cause

The `RenderWithMath` component's `text` prop was receiving non-string values (likely `undefined`, `null`, or objects) but only had a basic truthy check:

```typescript
if (!text) return null;
```

This check fails for:
- **Objects**: `!{}` is `false`, so objects pass through
- **Arrays**: `![]` is `false`, so empty arrays pass through
- **Other truthy values**: Any non-falsy value passes

When a non-string value reaches line 177:
```typescript
let cleanText = text
  .replace(/\\\\n/g, '\n')  // ❌ Crashes if text is not a string
```

## Solution Implemented

### Enhanced Type Guards

Applied to multiple components in `components/MathRenderer.tsx`:

#### 1. RenderWithMath Component (lines 171-180)

**Before**:
```typescript
if (!text) return null;
```

**After**:
```typescript
// TYPE GUARD: Ensure text is a valid string
if (!text || typeof text !== 'string') {
  console.warn('⚠️ RenderWithMath received invalid text prop:', {
    type: typeof text,
    value: text,
    isNull: text === null,
    isUndefined: text === undefined
  });
  return null;
}
```

#### 2. DerivationStep Component (lines 137-144)

**Added**:
```typescript
// TYPE GUARD: Ensure content is a valid string
if (!content || typeof content !== 'string') {
  console.warn('⚠️ DerivationStep received invalid content prop:', {
    type: typeof content,
    value: content
  });
  return null;
}
```

#### 3. MathRenderer Component (line 60)

**Already Safe** (no changes needed):
```typescript
if (typeof rawExpression === 'string' && rawExpression.trim()) {
  // Process expression
}
```

### Why This Works

1. **`!text`/`!content`**: Catches `null`, `undefined`, `''` (empty string), `0`, `false`
2. **`typeof !== 'string'`**: Catches objects, arrays, numbers, booleans, functions
3. **Combined with OR (`||`)**: If either condition is true, the component safely returns `null`
4. **Detailed logging**: Helps debug where invalid data is coming from
5. **Applied consistently**: All text-rendering components now protected

### Benefits

✅ **Prevents crashes**: Component gracefully handles invalid input
✅ **Diagnostic logging**: Console warning shows what invalid data was passed
✅ **Safe fallback**: Returns `null` instead of crashing the entire app
✅ **Type safety**: Ensures only strings are processed

## Test Cases

### Test Case 1: Valid String (Normal Operation)
```typescript
<RenderWithMath text="The formula is $x^2 + y^2 = r^2$" />
```
**Result**: ✅ Renders correctly

### Test Case 2: Empty String
```typescript
<RenderWithMath text="" />
```
**Result**: ✅ Returns `null`, no crash

### Test Case 3: Undefined
```typescript
<RenderWithMath text={undefined} />
```
**Result**: ✅ Returns `null`, logs warning

### Test Case 4: Null
```typescript
<RenderWithMath text={null} />
```
**Result**: ✅ Returns `null`, logs warning

### Test Case 5: Object (The Crash Case)
```typescript
<RenderWithMath text={{id: 1, content: "test"}} />
```
**Before**: ❌ `TypeError: text.replace is not a function`
**After**: ✅ Returns `null`, logs warning with object details

### Test Case 6: Array
```typescript
<RenderWithMath text={["line1", "line2"]} />
```
**Before**: ❌ `TypeError: text.replace is not a function`
**After**: ✅ Returns `null`, logs warning

### Test Case 7: Number
```typescript
<RenderWithMath text={42} />
```
**Before**: ❌ `TypeError: text.replace is not a function`
**After**: ✅ Returns `null`, logs warning

## Likely Sources of Invalid Data

Based on recent changes, invalid data might come from:

### 1. Extraction Issues
If `simpleMathExtractor.ts` returns incomplete questions:
```typescript
{
  id: 7,
  text: undefined,  // ❌ AI extraction failed
  options: [...],
  _extractionIssues: true
}
```

### 2. Option Objects Instead of Strings
If options array is passed directly:
```typescript
<RenderWithMath text={question.options} />
// ❌ Passing array of objects instead of string
```

Should be:
```typescript
<RenderWithMath text={question.text} />
// ✅ Passing the text string
```

### 3. Nested Properties
If trying to render nested object:
```typescript
<RenderWithMath text={question.blueprint} />
// ❌ Passing object instead of string
```

Should be:
```typescript
<RenderWithMath text={question.blueprint.coreTheory} />
// ✅ Passing specific string property
```

## Console Output Examples

### When Receiving Object:
```
⚠️ RenderWithMath received invalid text prop: {
  type: "object",
  value: {id: 7, text: "..."},
  isNull: false,
  isUndefined: false
}
```

### When Receiving Undefined:
```
⚠️ RenderWithMath received invalid text prop: {
  type: "undefined",
  value: undefined,
  isNull: false,
  isUndefined: true
}
```

### When Receiving Array:
```
⚠️ RenderWithMath received invalid text prop: {
  type: "object",
  value: ["option1", "option2"],
  isNull: false,
  isUndefined: false
}
```

## Debugging Workflow

If you see the warning in console:

1. **Check the console warning** - it shows what invalid data was passed
2. **Trace the call stack** - find which component is calling RenderWithMath
3. **Inspect the source data** - check where the data comes from (API, extraction, state)
4. **Fix the source** - ensure only strings are passed to `text` prop

Example debugging:
```
⚠️ RenderWithMath received invalid text prop: {type: "object", value: {...}}
    at RenderWithMath (MathRenderer.tsx:172)
    at QuestionCard (ExamAnalysis.tsx:542)  ← Found it!
```

Then check `ExamAnalysis.tsx:542`:
```typescript
<RenderWithMath text={question.options} />  // ❌ Wrong
<RenderWithMath text={question.text} />     // ✅ Correct
```

## Prevention

### TypeScript Prop Type
The component already has proper TypeScript typing:
```typescript
export const RenderWithMath: React.FC<{
  text: string,  // ← Properly typed as string
  className?: string,
  ...
}>
```

However, TypeScript types are erased at runtime, so runtime validation is still needed.

### ESLint Rule (Optional)
Could add ESLint rule to catch this at compile time:
```json
{
  "rules": {
    "@typescript-eslint/strict-boolean-expressions": "error"
  }
}
```

### Unit Tests (Recommended)
```typescript
describe('RenderWithMath', () => {
  it('should handle undefined text', () => {
    const { container } = render(<RenderWithMath text={undefined as any} />);
    expect(container.firstChild).toBeNull();
  });

  it('should handle object text', () => {
    const { container } = render(<RenderWithMath text={{} as any} />);
    expect(container.firstChild).toBeNull();
  });
});
```

## Related Fixes

This fix complements other recent validation improvements:

1. **Extraction validation** (`simpleMathExtractor.ts`): Catches incomplete data at source
2. **KaTeX error handling** (`MathRenderer.tsx`): Handles invalid LaTeX gracefully
3. **Type guards**: Now applied consistently across rendering components

## Verification

After this fix:

1. ✅ No more `text.replace is not a function` crashes
2. ✅ Console warnings show diagnostic info when invalid data is passed
3. ✅ App continues running even with bad data
4. ✅ Easy to debug source of invalid data from warning logs

## Files Modified

1. **`components/MathRenderer.tsx`**:
   - **`RenderWithMath` component**: Added comprehensive type guard (lines 171-180)
   - **`DerivationStep` component**: Added type guard (lines 137-144)
   - **`MathRenderer` component**: Already had type safety (line 60)
   - Added diagnostic logging for both components
   - Prevents TypeError crashes across all rendering components

---

**Status**: ✅ Complete
**Impact**: Critical - prevents app crashes
**Safety**: 🟢 Graceful error handling with diagnostic logging
**Related**: `EXTRACTION_QUALITY_FIXES.md`, `KATEX_ERROR_FIXES.md`
