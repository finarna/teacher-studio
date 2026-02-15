# TOPIC VERIFICATION CHECKLIST
**Scan:** 02-KCET-Board-Exam-Maths-20-05-2023-M7
**Date:** February 13, 2026
**Status:** ⏳ Processing (Extraction attempt 2/3)

---

## WHAT TO VERIFY (Once Scan Completes)

### ✅ 1. Topic Names Consistency

**Check in browser console:**
```
Look for logs like:
"🔍 [transformQuestion] DB Question Metadata: { topic: '...', domain: '...' }"
```

**Expected Official Topics (from topics table):**
- Matrices
- Determinants
- Probability
- Statistics
- Permutations and Combinations
- Binomial Theorem
- Sequences and Series
- Complex Numbers
- Quadratic Equations
- Linear Inequalities
- Limits and Continuity
- Continuity and Differentiability
- Applications of Derivatives
- Integrals
- Applications of Integrals
- Differential Equations
- Vector Algebra
- Three Dimensional Geometry
- Linear Programming
- Relations and Functions
- Inverse Trigonometric Functions
- Matrices and Determinants

**❌ Common Unofficial Names (should NOT appear):**
- "Mathematics" (too generic)
- "General" (too generic)
- "3D Geometry" (should be "Three Dimensional Geometry")
- "Application of Derivatives" (should be "Applications of Derivatives")
- "Integration" (should be "Integrals")
- "Derivatives" (should be "Continuity and Differentiability")
- "Definite Integrals" (should be "Integrals")
- "MATRICES" (case mismatch - should be "Matrices")

---

### ✅ 2. Domain/Chapter Grouping Correct

**Expected Math Domains:**
- ALGEBRA
- CALCULUS
- TRIGONOMETRY
- COORDINATE GEOMETRY
- VECTORS & 3D GEOMETRY
- STATISTICS & PROBABILITY
- DIFFERENTIAL EQUATIONS
- LINEAR PROGRAMMING
- RELATIONS & FUNCTIONS

**❌ Wrong Domain Examples (from previous scans):**
- MATHEMATICS (too broad - should use specific domains)
- ELECTRODYNAMICS (Physics domain, not Math)
- "none" or missing domain

**Correct Mappings:**
```
Matrices → ALGEBRA
Determinants → ALGEBRA
Probability → STATISTICS & PROBABILITY
Limits and Continuity → CALCULUS
Integrals → CALCULUS
Vector Algebra → VECTORS & 3D GEOMETRY
Three Dimensional Geometry → VECTORS & 3D GEOMETRY
Linear Programming → LINEAR PROGRAMMING
```

---

### ✅ 3. Topics Appear in Learning Journey

**How to Check:**
1. After scan completes, go to **Topics** page
2. Filter by: Mathematics → KCET
3. Topics from this scan should appear in the list

**Expected Behavior:**
- Topics aggregate questions from all scans
- Question count updates (e.g., if Matrices had 168 questions before, it should increase)
- New topics appear if they didn't exist before

**What to Verify:**
```
Topic Card Example:
┌─────────────────────────────┐
│  Matrices                   │
│  Math • KCET                │
│  31 Questions  0% Accuracy  │  ← Question count should match scan
└─────────────────────────────┘
```

---

### ✅ 4. Learn Tab Correctly Matches Topics to Visual Sketches

**How to Check:**
1. Go to **Topics → [Select any topic from scan] → LEARN tab**
2. Check if visual sketches appear (if generated)

**Current Status from Console:**
```
📚 [LEARN TAB] Loaded 0 visual sketches for Probability
```

**Why 0 Sketches:**
- ❌ No visual sketches generated yet for this scan
- ❌ Or topic name mismatch preventing match

**How to Fix:**
1. **Generate Sketches:** In Exam Analysis, click "Generate Visual Notes"
2. **Verify Topic Match:** Ensure question.topic === topicResource.topicName

**Expected After Generating Sketches:**
```
📚 [LEARN TAB] Loaded 5 visual sketches for Matrices
```

And the Learn tab should display:
```
Visual Sketch Notes          [5 Sketches]
AI-generated visual explanations...

┌─────┐  ┌─────┐  ┌─────┐
│  1  │  │  2  │  │  3  │  ← SVG sketches in gallery
│ SVG │  │ SVG │  │ SVG │
└─────┘  └─────┘  └─────┘
```

---

## VERIFICATION STEPS (After Scan Completes)

### Step 1: Check Console Logs

Open browser DevTools → Console, look for:

```javascript
// Topic extraction logs
🔍 [transformQuestion] DB Question Metadata: {
  topic: 'Matrices',           // ← Should be official name
  domain: 'ALGEBRA',            // ← Should be correct domain
  marks: 1,
  difficulty: 'Moderate',
  blooms: 'Apply'
}
```

**Record:**
- [ ] All topics use official names (no "Mathematics", "General", etc.)
- [ ] All domains are correct Math domains (no "ELECTRODYNAMICS", etc.)
- [ ] No case mismatches (no "MATRICES", "INTEGRATION", etc.)

---

### Step 2: Check Exam Analysis View

In the Intelligence Hub (scan view):

1. **Scroll down to Questions section**
2. **Check first 5-10 questions:**
   - What topic labels appear?
   - What domain/chapter is shown?
   - Are they consistent?

**Example Good Question:**
```
Q1: [Question text...]
Topic: Matrices
Domain: ALGEBRA
Difficulty: Moderate
Marks: 1
```

**Example Bad Question:**
```
Q1: [Question text...]
Topic: Mathematics  ❌ Too generic
Domain: none        ❌ Missing
Difficulty: Moderate
Marks: 1
```

---

### Step 3: Navigate to Topics Page

**URL:** `/topics` or click "Topics" in sidebar

**Check:**
1. Filter: Mathematics → KCET
2. Count how many topics appear
3. Click on a topic (e.g., "Matrices")
4. Verify question count matches

**Record:**
- [ ] Topics from scan appear in list
- [ ] Question counts are accurate
- [ ] No duplicate topics (e.g., "Matrices" and "MATRICES" as separate entries)

---

### Step 4: Test Learn Tab

**For each topic:**
1. Click topic → Go to **LEARN** tab
2. Check browser console for:
   ```
   📚 [LEARN TAB] Loaded X visual sketches for [Topic]
   ```

**Expected Scenarios:**

**Scenario A: Sketches Generated**
```
📚 [LEARN TAB] Loaded 5 visual sketches for Matrices
```
✅ Gallery displays 5 sketch cards
✅ Each sketch shows SVG image
✅ Question preview text visible

**Scenario B: No Sketches Generated**
```
📚 [LEARN TAB] Loaded 0 visual sketches for Matrices
```
✅ Empty state shows (if no chapter insights either)
✅ OR only chapter insights section visible

**Scenario C: Topic Mismatch**
```
📚 [LEARN TAB] Loaded 0 visual sketches for Three Dimensional Geometry
```
But questions have topic "3D Geometry" ❌
→ **Fix:** Normalize topic names in scan

---

## COMMON ISSUES & FIXES

### Issue 1: Generic Topics Extracted

**Symptom:**
```javascript
topic: 'Mathematics'  // ❌ Too generic
topic: 'General'      // ❌ Not specific
topic: 'Physics'      // ❌ Wrong subject for Math scan
```

**Root Cause:**
- Extraction prompt not enforcing official topics
- AI defaulting to broad categorization

**Fix:**
Update `utils/simpleMathExtractor.ts` prompt to include official topic list:
```typescript
const prompt = `
...
Use ONLY these official topic names:
- Matrices
- Determinants
- Probability
- Statistics
...

NEVER use generic names like "Mathematics", "General", or "Math".
`;
```

---

### Issue 2: Domain Mismatches

**Symptom:**
```javascript
topic: 'Matrices',
domain: 'MATHEMATICS'  // ❌ Too broad

topic: 'Vectors',
domain: 'ELECTRODYNAMICS'  // ❌ Wrong subject
```

**Fix:**
Add domain validation in extraction:
```typescript
const MATH_DOMAINS = {
  'Matrices': 'ALGEBRA',
  'Determinants': 'ALGEBRA',
  'Probability': 'STATISTICS & PROBABILITY',
  'Integrals': 'CALCULUS',
  // ...
};

// After extraction, normalize:
question.domain = MATH_DOMAINS[question.topic] || question.domain;
```

---

### Issue 3: Case Sensitivity Variations

**Symptom:**
```javascript
topic: 'Matrices'  // Q1-20
topic: 'MATRICES'  // Q21 ❌ Separate topic!
topic: 'matrices'  // Q22 ❌ Another duplicate!
```

**Impact:**
- Learning Journey shows 3 separate topics
- Question counts split across duplicates
- Learn tab can't match sketches

**Fix:**
Normalize case in aggregation:
```typescript
// In lib/topicAggregator.ts
const normalizedTopic = topic.trim()
  .split(' ')
  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  .join(' ');
```

---

### Issue 4: Visual Sketches Don't Appear

**Symptom:**
```
📚 [LEARN TAB] Loaded 0 visual sketches for Probability
```
But scan has Probability questions with sketchSvg!

**Debug:**
```javascript
// Check in TopicDetailPage.tsx useEffect logs:
console.log('Topic matching:', {
  questionTopic: 'Probability',
  resourceTopic: 'Probability and Statistics',  // ❌ Mismatch!
  matches: questionTopic === resourceTopic  // false
});
```

**Fix:**
Improve matching logic:
```typescript
// In LearnTab useEffect
const topicMatches = (questionTopic, resourceTopic) => {
  const normalize = (str) => str.toLowerCase().trim();
  const q = normalize(questionTopic);
  const r = normalize(resourceTopic);

  return q === r ||
         q.includes(r) ||
         r.includes(q) ||
         // Handle common variations
         (q === 'probability' && r === 'probability and statistics') ||
         (q === '3d geometry' && r === 'three dimensional geometry');
};
```

---

## EXPECTED RESULTS (Good Scan)

### ✅ Console Logs Should Show:

```javascript
// Extraction
🔄 Extraction attempt 2/3...
✅ Extracted 60 questions

// Question transformation
🔍 [transformQuestion] DB Question Metadata: {
  topic: 'Matrices',
  domain: 'ALGEBRA',
  marks: 1,
  difficulty: 'Moderate'
}
🔍 [transformQuestion] DB Question Metadata: {
  topic: 'Determinants',
  domain: 'ALGEBRA',
  marks: 1,
  difficulty: 'Hard'
}
🔍 [transformQuestion] DB Question Metadata: {
  topic: 'Probability',
  domain: 'STATISTICS & PROBABILITY',
  marks: 2,
  difficulty: 'Easy'
}

// Learning Journey loading
[Learning Journey] Loaded 13 topics for Math (234 questions)
📡 [Context] First Question from API: { topic: 'Matrices', domain: 'ALGEBRA' }

// Learn tab loading (after generating sketches)
📚 [LEARN TAB] Loaded 5 visual sketches for Matrices
```

---

### ✅ Topics Page Should Show:

```
Mathematics → KCET

┌─────────────────────────┐
│ Matrices                │
│ Math • KCET • Algebra   │  ← Domain visible
│ 180 Questions  75%      │  ← Updated count
└─────────────────────────┘

┌─────────────────────────┐
│ Determinants            │
│ Math • KCET • Algebra   │
│ 95 Questions  65%       │
└─────────────────────────┘

┌─────────────────────────┐
│ Probability             │
│ Math • KCET • Stats     │
│ 45 Questions  80%       │
└─────────────────────────┘
```

---

### ✅ Learn Tab Should Show:

```
┌──────────────────────────────────────┐
│ 🎨 AI Study Guide                    │
│ Personalized guide to Matrices       │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Visual Sketch Notes    [5 Sketches]  │
│ AI-generated visual explanations...  │
│                                      │
│ ┌───────┐ ┌───────┐ ┌───────┐       │
│ │   1   │ │   2   │ │   3   │       │
│ │  SVG  │ │  SVG  │ │  SVG  │       │
│ │ Q1... │ │ Q5... │ │ Q12...│       │
│ └───────┘ └───────┘ └───────┘       │
└──────────────────────────────────────┘
```

---

## ACTION ITEMS (If Issues Found)

### If Generic Topics Found:
- [ ] Update extraction prompt to enforce official topics
- [ ] Run migration script to fix existing scans
- [ ] Add validation at save time

### If Domain Mismatches Found:
- [ ] Create domain mapping table
- [ ] Apply corrections in aggregation layer
- [ ] Update extraction to use correct domains

### If Case Variations Found:
- [ ] Normalize case in aggregation
- [ ] Update existing database entries
- [ ] Add case-insensitive matching

### If Learn Tab Empty:
- [ ] Generate visual sketches for questions
- [ ] Improve topic matching logic
- [ ] Check console logs for load errors

---

## NEXT STEPS

**Once scan completes:**

1. ✅ Open browser DevTools → Console
2. ✅ Record all topic/domain values from logs
3. ✅ Navigate to Topics page → Verify topics appear
4. ✅ Click a topic → LEARN tab → Check visual sketches
5. ✅ Report findings

**Then I will:**
- Analyze the exact topic/domain values extracted
- Identify any mismatches or inconsistencies
- Provide specific fixes for any issues found
- Update extraction prompts if needed
- Create migration script if database fixes required

---

**Status:** ⏳ Waiting for scan to complete (currently at attempt 2/3)

**Last Updated:** February 13, 2026 14:22 (extraction attempt 2 started)

---

END OF VERIFICATION CHECKLIST
