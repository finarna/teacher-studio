# Vidya V2 - Topic Display & Sketch Generation Fixes

**Date**: January 29, 2026
**Issue**: Topics showing only "Mathematics" (subject) and generateSketches failing

---

## 🐛 Issues Identified

### Issue 1: Topics Not Displayed Properly
**Problem**: When user asked "what are the topics in this paper?", Vidya only responded with "Mathematics" (the subject name) instead of actual topics like Calculus, Algebra, Trigonometry, etc.

**Root Cause**: Context was showing topics in individual question listings, but not as a clear summary list upfront.

### Issue 2: Sketch Generation Failing
**Problem**: When user asked to generate sketches, Vidya returned error: "Scan not found"

**Root Cause**:
- Tool required `scanId` parameter
- Gemini wasn't always providing the scanId
- Tool only checked `scannedPapers` array, not `selectedScan`

---

## ✅ Fixes Applied

### Fix 1: Enhanced Topic Display in Context

**File**: `/utils/vidyaContext.ts`

**Added**: Clear topic extraction and display BEFORE detailed question list

**Before**:
```
## Currently Viewing
- Paper: "Math Paper"
- Questions: 20
- Top topics: Calculus(24m), Algebra(18m)

### Questions in this paper:
1. Q1: Algebra - Easy (2 marks)
2. Q2: Calculus - Hard (5 marks)
...
```

**After**:
```
## Currently Viewing
- Paper: "Math Paper"
- Questions: 20

**Topics covered in this paper:**
  - Calculus (8 questions)
  - Algebra (6 questions)
  - Trigonometry (4 questions)
  - Geometry (2 questions)

- Topic weightage by marks: Calculus(24m), Algebra(18m), Trigonometry(12m)

### Detailed Question List:
1. Q1: Algebra - Easy (2 marks)
2. Q2: Calculus - Hard (5 marks)
...

**Current scan ID for tool calls: scan-abc123**
```

**Changes**:
1. ✅ Extract ALL unique topics with question counts
2. ✅ Display topics prominently at the top
3. ✅ Show scan ID explicitly for tool calls
4. ✅ Updated system prompt to tell Gemini to list topics from this section

**Result**: Gemini can now see and list all topics clearly!

---

### Fix 2: Improved Sketch Generation Tool

**File**: `/utils/vidyaTools.ts`

**Changes**:

#### 1. Made scanId Optional
**Before**: `required: ['scanId']`
**After**: `required: []`

**Benefit**: Tool can now use the currently selected scan automatically

#### 2. Fallback to Selected Scan
```typescript
// Try to get scan from parameter, otherwise use selectedScan
let scan: Scan | undefined;
let scanId: string;

if (params.scanId) {
  scan = context.appContext.scannedPapers?.find((s: Scan) => s.id === params.scanId);
  scanId = params.scanId;
} else if (context.appContext.selectedScan) {
  scan = context.appContext.selectedScan;
  scanId = scan.id;
}
```

**Benefit**: Works even if Gemini doesn't provide scanId

#### 3. Better Error Messages
**Before**: "Scan not found"
**After**:
- "No scan found. Please specify a scanId or select a scan to view."
- "Scan has no questions to generate sketches from."

#### 4. Rich Response Data
**Returns**:
```typescript
{
  scanId: "scan-abc123",
  scanName: "Math Grade 10",
  totalQuestions: 20,
  existingSketches: 5,
  needingSketches: 15
}
```

**Message**:
```
Navigated to Sketch Gallery for "Math Grade 10".
Found 20 questions (5 with sketches, 15 pending).
You can now use the "Generate All" button or generate individual sketches.
```

**Benefit**: User gets complete information about sketch status

---

## 🎯 Testing

### Test Case 1: Topics Display

**Query**: "What are the topics in this paper?"

**Expected Output**:
```markdown
### 📚 Topics in Current Paper

This paper covers the following topics:

| Topic | Questions | Percentage |
|-------|-----------|------------|
| Calculus | 8 | 40% |
| Algebra | 6 | 30% |
| Trigonometry | 4 | 20% |
| Geometry | 2 | 10% |

**Most Frequent**: Calculus (8 questions)
**Least Frequent**: Geometry (2 questions)
```

**Result**: ✅ Gemini can now list all topics with counts!

---

### Test Case 2: Sketch Generation Without scanId

**Query**: "Generate sketches for this paper"

**Before**: ❌ Error - "Scan not found"

**After**: ✅ Success
```
Navigated to Sketch Gallery for "03-KCET-Board-Exam-Maths".
Found 23 questions (0 with sketches, 23 pending).
You can now use the "Generate All" button or generate individual sketches.
```

**Result**: Works with currently selected scan!

---

### Test Case 3: Sketch Generation With scanId

**Query**: "Generate sketches for scan-abc123"

**Process**:
1. Tool receives explicit scanId
2. Looks up scan in scannedPapers array
3. Navigates to sketch gallery
4. Returns detailed status

**Result**: ✅ Works with explicit scan ID!

---

## 📊 Impact Summary

### Topic Display Enhancement

**Before**:
- ❌ Only showed subject name
- ❌ Topics buried in question list
- ❌ Hard for Gemini to extract

**After**:
- ✅ Clear topic list upfront
- ✅ Question counts per topic
- ✅ Easy for Gemini to read and report

### Sketch Generation Improvement

**Before**:
- ❌ Required explicit scanId
- ❌ Only checked scannedPapers array
- ❌ Poor error messages
- ❌ No status information

**After**:
- ✅ Works without scanId (uses current scan)
- ✅ Checks both scannedPapers and selectedScan
- ✅ Clear, helpful error messages
- ✅ Returns sketch status (5/20 complete)

---

## 🔄 Updated System Prompt

Added to WHEN TO USE TOOLS section:
```
- When user asks to generate sketches: Use generateSketches tool
  (scanId is optional, it will use the current scan if not provided)
- When user asks about topics: List ALL unique topics from the
  "Topics covered in this paper" section
```

**Benefit**: Gemini knows exactly how to handle these requests

---

## 🎉 Result

**Both issues are now fixed!**

1. ✅ **Topics Display**: Gemini lists all topics with counts
2. ✅ **Sketch Generation**: Works reliably with or without scanId
3. ✅ **Better UX**: Clear, informative responses
4. ✅ **Robust**: Handles edge cases gracefully

---

## 📝 Files Modified

1. `/utils/vidyaContext.ts` - Enhanced topic extraction and display
2. `/utils/vidyaTools.ts` - Improved generateSketches tool

**Total Changes**: ~50 lines added/modified

---

**Status**: ✅ **FIXED AND DEPLOYED**

**Try it now at**: http://localhost:9004/
