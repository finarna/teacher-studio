# Biology UI Fix - Escaped Underscores Issue

**Date:** April 18, 2026
**Issue:** Question #14 showing junk characters instead of blanks
**Status:** ✅ FIXED

---

## Problem Identified

**Question ID:** `413a56f2-7c31-48c4-8a95-0a29d20c85c5`
**Location:** Biology Set-B, Question #14
**File:** `flagship_biology_final_b.json`

### What the User Saw:

```
After separating DNA fragments using agarose gel electrophoresis, a student observes
the gel under normal visible light but sees no bands. To visualize the separated DNA
fragments as bright orange colored bands, the student must stain the gel with
\_\_\_\_\_\_\_ and then expose it to \_\_\_\_\_\_\_.
```

The blanks showed as `\_\_\_\_\_\_\_` (escaped underscores) instead of `_______` (regular underscores).

---

## Root Cause

The AI-generated question text had **escaped underscores** in the JSON:
- **Before:** `\\_\\_\\_\\_\\_\\_\\_` (backslash-escaped)
- **After:** `_______` (regular underscores)

This occurred during the initial AI generation when the model produced the question text with LaTeX-style escaping for the blank spaces.

---

## Fix Applied

**File:** `flagship_biology_final_b.json`
**Line:** 473

### Change Made:
```diff
- "text": "... stain the gel with \\_\\_\\_\\_\\_\\_\\_ and then expose it to \\_\\_\\_\\_\\_\\_\\_.",
+ "text": "... stain the gel with _______ and then expose it to _______.",
```

### Verification:
```bash
# Check for escaped underscores
grep '\\_\\_' flagship_biology_final.json flagship_biology_final_b.json
# Result: No escaped underscores found ✅

# Validate JSON
jq empty flagship_biology_final_b.json
# Result: ✅ JSON is valid
```

---

## How to Identify Similar Issues

### Search Command:
```bash
# Find escaped underscores in question text
grep -n '\\_\\_' flagship_*.json

# Find any escaped characters in text fields
grep -n 'text.*\\\\' flagship_*.json | grep -v '\text\|\\n\|\\%\|\^\|Rightarrow'
```

### What's Normal:
- LaTeX math: `$\text{...}$` ✅
- Newlines: `\\n` ✅
- LaTeX symbols: `\Rightarrow`, `\%`, `\^` ✅
- Math spacing: `\\ ` ✅

### What's a Problem:
- Escaped underscores in prose: `\\_\\_\\_` ❌
- Escaped quotes in text: `\\\"` ❌
- Other non-LaTeX escapes: `\\-`, `\\+` ❌

---

## Prevention for Future Generations

### Generator Fix Needed:

**File:** `lib/aiQuestionGenerator.ts`

Add post-processing to clean escaped characters:

```typescript
// After AI generation, clean up escaped underscores
function cleanQuestionText(text: string): string {
  // Remove backslash escapes for underscores (blanks)
  text = text.replace(/\\_+/g, (match) => '_'.repeat(match.length / 2));

  // But preserve LaTeX escapes
  // Don't touch: \text{}, \Rightarrow, \%, etc.

  return text;
}
```

### Add to Export Script:

**File:** `scripts/oracle/export_biology_flagship_latest.ts`

Add validation before export:

```typescript
// Validate question text
questions.forEach((q, idx) => {
  // Check for escaped underscores (not in LaTeX)
  const hasEscapedUnderscores = q.text.match(/\\_\\_/g);

  if (hasEscapedUnderscores && !q.text.includes('$')) {
    console.warn(`⚠️  Question ${idx + 1} has escaped underscores (may render as junk)`);
    console.warn(`   ID: ${q.id}`);
    console.warn(`   Text: ${q.text.substring(0, 100)}...`);
  }
});
```

---

## User Impact

**Before Fix:**
- Question showed garbled text: `\_\_\_\_\_\_\_`
- Poor user experience
- Looked unprofessional

**After Fix:**
- Question shows proper blanks: `_______`
- Clean rendering
- Professional appearance

---

## Testing Checklist

After applying similar fixes:

- [ ] JSON validates with `jq empty`
- [ ] Hard refresh browser (Cmd+Shift+R)
- [ ] Open affected test in UI
- [ ] Verify question renders correctly
- [ ] No `\\_` visible in question text
- [ ] Blanks appear as underscores `_______`

---

## Related Questions

**Checked:** All 120 Biology questions (SET A + SET B)
**Found:** Only 1 instance of this issue
**Fixed:** ✅ Complete

**Scan of SET A:**
```bash
grep '\\_\\_' flagship_biology_final.json
# Result: No matches (all clear)
```

**Scan of SET B:**
```bash
grep '\\_\\_' flagship_biology_final_b.json
# Before fix: 1 match (line 473)
# After fix: No matches ✅
```

---

## Git Commit

```bash
git add flagship_biology_final_b.json docs/oracle/BIOLOGY_UI_FIX_ESCAPED_UNDERSCORES.md

git commit -m "fix(oracle): remove escaped underscores in Biology Q14

- Fixed question 413a56f2-7c31-48c4-8a95-0a29d20c85c5
- Changed \\_\\_\\_\\_\\_\\_\\_ to _______ in question text
- Question now renders properly in UI (no junk characters)
- Verified: All 120 Biology questions scanned, only 1 instance found

Issue: User reported question showing \_\_\_\_\_\_\_ instead of blanks
File: flagship_biology_final_b.json line 473"
```

---

**Fixed By:** Claude Code
**Verification:** User should hard refresh and verify question renders correctly
**Status:** ✅ READY FOR PRODUCTION
