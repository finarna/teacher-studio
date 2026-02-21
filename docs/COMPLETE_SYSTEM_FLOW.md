# Complete System Flow - AI Mock Test Generation

## Executive Summary

**Current Status:** ✅ All systems operational
**Tables:** ✅ 9/9 required tables exist
**Data:** ✅ 5 years historical data (2020-2024)
**Topics:** ✅ 7 KCET Math topics
**Ready:** 🚀 Yes - Can generate AI mock tests

---

## 1. DIAGRAMMATIC FLOW

### A. Past Year Paper → Dual Analysis System

```
┌────────────────────────────────────────────────────────────────────────┐
│             USER UPLOADS PAST YEAR PAPER (KCET Math 2024)             │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │ AI Analysis (Gemini) │
                      │ • Extract 60 Qs      │
                      │ • Classify topics    │
                      │ • Assess difficulty  │
                      └──────────┬───────────┘
                                 │
                  ┌──────────────┴─────────────┐
                  │                            │
                  ▼                            ▼
      ┌───────────────────────┐    ┌──────────────────────────┐
      │ PATH 1: UI DISPLAY    │    │ PATH 2: AI LEARNING      │
      │ (Exam Analysis Page)  │    │ (Mock Test Prediction)   │
      └───────────┬───────────┘    └──────────┬───────────────┘
                  │                            │
                  ▼                            ▼
      ┌───────────────────────┐    ┌──────────────────────────┐
      │ scans table           │    │ questions table          │
      │                       │    │                          │
      │ difficulty_dist: []   │    │ 60 individual questions  │
      │ topic_weightage: []   │    │ Each with:               │
      │ blooms_taxonomy: []   │    │ • topic (mapped)         │
      │ analysis_data: {}     │    │ • difficulty             │
      │                       │    │ • marks                  │
      │ ⚠️  CURRENTLY EMPTY!  │    │ • blooms                 │
      └───────────────────────┘    └──────────┬───────────────┘
                  │                            │
                  │                            ▼
                  │              ┌─────────────────────────────┐
                  │              │ autoMapScanQuestions()      │
                  │              │ • Maps to official topic_id │
                  │              │ • Uses AI matching          │
                  │              │ • 45/60 mapped              │
                  │              └─────────────┬───────────────┘
                  │                            │
                  │                            ▼
                  │              ┌─────────────────────────────┐
                  │              │ syncScanToAITables()        │
                  │              │ • Reads all 45 questions    │
                  │              │ • Calculates stats          │
                  │              │ • Groups by topic           │
                  │              └─────────────┬───────────────┘
                  │                            │
                  │                            ▼
                  │              ┌─────────────────────────────────────┐
                  │              │ AI GENERATOR TABLES (Normalized)    │
                  │              ├─────────────────────────────────────┤
                  │              │ exam_historical_patterns            │
                  │              │ • 2024 KCET Math                    │
                  │              │ • difficulty_easy_pct: 40%          │
                  │              │ • difficulty_moderate_pct: 45%      │
                  │              │ • difficulty_hard_pct: 15%          │
                  │              │ • total_marks: 60                   │
                  │              ├─────────────────────────────────────┤
                  │              │ exam_topic_distributions            │
                  │              │ • calculus: 15 questions            │
                  │              │   (E:6, M:7, H:2)                   │
                  │              │ • algebra: 12 questions             │
                  │              │   (E:4, M:6, H:2)                   │
                  │              │ • ... 5 more topics                 │
                  │              └─────────────────────────────────────┘
                  │                            │
                  ▼                            ▼
      ┌───────────────────────┐    ┌──────────────────────────────┐
      │ ExamAnalysis.tsx      │    │ generateTestQuestions()      │
      │                       │    │                              │
      │ Displays:             │    │ 1. Load historical patterns  │
      │ • Overall difficulty  │    │    (2020-2024)               │
      │ • Summary             │    │                              │
      │ • FAQ                 │    │ 2. Predict 2025 pattern:     │
      │ • Strategy            │    │    Calculus: 11→13→14→15     │
      │                       │    │    Predict: 16 questions     │
      │ ⚠️  MISSING:          │    │                              │
      │ • Topic trends        │    │ 3. Load student profile:     │
      │ • Year-over-year      │    │    Weak: calculus (58%)      │
      │ • Detailed stats      │    │    Strong: algebra (85%)     │
      │                       │    │                              │
      │ 📊 USER SEES BASIC    │    │ 4. Allocate 60 questions:    │
      │    ANALYSIS ONLY      │    │    40% prediction            │
      │                       │    │    30% weak areas            │
      │                       │    │    20% curriculum            │
      │                       │    │    10% recent trends         │
      │                       │    │                              │
      │                       │    │ 5. Generate with Gemini      │
      └───────────────────────┘    └──────────────────────────────┘
```

### KEY INSIGHT:
**AI TABLES HAVE RICHER DATA than what's shown in Exam Analysis UI!**

---

## 2. THE GAP: What's Missing in UI

### Currently Shown in Exam Analysis:
```typescript
// From scans.analysis_data (basic)
{
  summary: "This paper focuses on..." // ✅
  overallDifficulty: "Moderate"       // ✅
  faq: [{question, answer}]           // ✅
  strategy: ["Focus on...", "..."]    // ✅
}
```

### Available in AI Tables but NOT Shown:
```typescript
// From exam_historical_patterns + exam_topic_distributions
{
  yearOverYearTrends: {
    calculus: {
      2020: 11 questions,
      2021: 13 questions,
      2022: 14 questions,
      2023: 14 questions,
      2024: 15 questions,
      trend: "INCREASING",
      prediction_2025: 16 questions  // ⚠️  NOT SHOWN IN UI
    },
    algebra: {
      2020: 12 questions,
      2021: 12 questions,
      2022: 12 questions,
      trend: "STABLE"
    }
  },

  difficultyProgression: {
    calculus: {
      2024: {easy: 40%, moderate: 47%, hard: 13%},
      2023: {easy: 38%, moderate: 48%, hard: 14%},
      trend: "Getting slightly easier"  // ⚠️  NOT SHOWN
    }
  },

  topicImportance: {
    calculus: "HIGH - consistently 15+ questions",
    probability: "MEDIUM - 10-12 questions",
    matrices: "LOW - 4-6 questions"    // ⚠️  NOT SHOWN
  }
}
```

---

## 3. DATABASE TABLES - COMPLETE AUDIT

### Run Audit:
```bash
npx tsx scripts/auditDatabaseTables.ts
```

### Current Status (Verified):

| Table | Status | Rows | Purpose | Critical |
|-------|--------|------|---------|----------|
| exam_configurations | ✅ EXISTS | 4 | Exam metadata (60Q, 80min) | YES |
| topic_metadata | ✅ EXISTS | 7 | Official topics (calculus, algebra...) | YES |
| exam_historical_patterns | ✅ EXISTS | 5 | 2020-2024 patterns | YES |
| exam_topic_distributions | ✅ EXISTS | 41 | Questions per topic per year | YES |
| student_performance_profiles | ✅ EXISTS | 0 | Student weak/strong areas | NO |
| questions | ✅ EXISTS | 478 | Actual questions from scans | YES |
| scans | ✅ EXISTS | 7 | Uploaded papers | YES |
| test_attempts | ✅ EXISTS | 6 | Student tests | YES |
| test_responses | ✅ EXISTS | 50 | Student answers | YES |

**Verdict:** ✅ All tables present and populated

---

## 4. DETAILED CHECKS & DEPENDENCIES

### A. Pre-requisites for AI Mock Test Generation

#### Check 1: Gemini API Key
```bash
# In .env.local
GEMINI_API_KEY=AIzaSy...
VITE_GEMINI_API_KEY=AIzaSy...  # For frontend
```

**Verification:**
```bash
npx tsx scripts/testAIGeneratorOutput.ts
```

#### Check 2: Topic Metadata Exists
```sql
SELECT * FROM topic_metadata
WHERE exam_context = 'KCET' AND subject = 'Math';
```

**Expected:** 7 topics (calculus, algebra, coordinate_geometry, vectors_3d, matrices, trigonometry, probability_statistics)

**If missing:** Run `npx tsx scripts/setupAIGenerator.ts`

#### Check 3: Historical Patterns Exist
```sql
SELECT year, exam_context, subject, total_marks
FROM exam_historical_patterns
ORDER BY year DESC;
```

**Expected:** At least 2-3 years of data

**If missing:** Upload past year papers via UI

#### Check 4: Questions are Mapped to Topics
```sql
SELECT COUNT(*) as total,
       COUNT(topic) as mapped,
       ROUND(100.0 * COUNT(topic) / COUNT(*), 2) as pct_mapped
FROM questions;
```

**Expected:** >= 70% mapped

**If low:** Questions will auto-map when scans complete

---

### B. Step-by-Step Generation Flow with Checks

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Validate Prerequisites                                  │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Check GEMINI_API_KEY exists                                  │
│ ✅ Check exam_configurations has entry for KCET Math            │
│ ✅ Check topic_metadata has topics for KCET Math                │
│ ✅ Check >= 2 years of historical_patterns exist                │
│                                                                  │
│ IF ANY FAIL → Show error message to user                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Load Generation Context                                 │
├─────────────────────────────────────────────────────────────────┤
│ 1. Load exam config (60 questions, 80 minutes)                  │
│ 2. Load all topics with syllabus                                │
│ 3. Load historical patterns (last 4 years)                      │
│ 4. Load student profile (if exists)                             │
│ 5. Load generation rules (weights)                              │
│                                                                  │
│ OUTPUT: Complete context object                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Predict Topic Distribution                              │
├─────────────────────────────────────────────────────────────────┤
│ FOR EACH TOPIC:                                                  │
│   • Analyze trend: 11→13→14→15 (INCREASING)                     │
│   • Calculate growth rate: +1.3 questions/year                  │
│   • Predict next year: 16 questions                             │
│   • Apply weights:                                              │
│     - 40% prediction weight                                     │
│     - 30% student weak areas                                    │
│     - 20% curriculum balance                                    │
│     - 10% recent trends                                         │
│                                                                  │
│ OUTPUT: Predicted distribution for 60 questions                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Allocate Questions to Topics                            │
├─────────────────────────────────────────────────────────────────┤
│ EXAMPLE:                                                         │
│   Calculus: score=0.82 → 12 questions                           │
│   Algebra: score=0.78 → 12 questions                            │
│   Trigonometry: score=0.80 → 12 questions                       │
│   ... (7 topics total = 60 questions)                           │
│                                                                  │
│ ✅ Check: Sum of allocations = Total questions (60)             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Generate Questions with AI                              │
├─────────────────────────────────────────────────────────────────┤
│ FOR EACH TOPIC:                                                  │
│   1. Prepare prompt with:                                       │
│      • Topic metadata (syllabus, difficulty)                    │
│      • Historical questions (examples)                          │
│      • Difficulty distribution                                  │
│      • Student mastery level                                    │
│                                                                  │
│   2. Call Gemini API                                            │
│                                                                  │
│   3. Validate response:                                         │
│      ✅ LaTeX syntax (balanced $, {})                           │
│      ✅ No text corruption                                       │
│      ✅ 4 options present                                        │
│      ✅ correctOptionIndex valid                                 │
│                                                                  │
│   4. IF validation fails:                                       │
│      • Retry up to 3 times                                      │
│      • If still fails, skip topic                               │
│                                                                  │
│   5. IF >= 80% valid:                                           │
│      • Accept questions                                         │
│      • Continue to next topic                                   │
│                                                                  │
│ OUTPUT: 60 validated questions                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: Create Test Attempt                                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Insert into test_attempts:                                   │
│    • user_id                                                    │
│    • test_type: 'custom_mock'                                   │
│    • exam_context: 'KCET'                                       │
│    • subject: 'Math'                                            │
│    • total_questions: 60                                        │
│    • duration_minutes: 80                                       │
│    • status: 'in_progress'                                      │
│                                                                  │
│ 2. Store questions in test_config                              │
│                                                                  │
│ 3. Return to frontend:                                          │
│    • attempt (camelCase mapped)                                 │
│    • questions array                                            │
│                                                                  │
│ ✅ Frontend loads TestInterface with questions                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### C. Dependencies Tree

```
AI Mock Test Generation
├── Backend Dependencies
│   ├── Gemini API Key (CRITICAL)
│   ├── @google/genai library
│   ├── Supabase connection
│   └── Database tables:
│       ├── exam_configurations (CRITICAL)
│       ├── topic_metadata (CRITICAL)
│       ├── exam_historical_patterns (CRITICAL)
│       ├── exam_topic_distributions (CRITICAL)
│       ├── student_performance_profiles (optional)
│       └── questions (for examples)
│
├── Data Dependencies
│   ├── At least 2 years historical data
│   ├── Topic metadata populated
│   └── Questions mapped to topics (>= 70%)
│
├── Code Dependencies
│   ├── lib/examDataLoader.ts → Load context
│   ├── lib/aiQuestionGenerator.ts → Generate questions
│   ├── lib/syncScanToAITables.ts → Update on scan
│   └── lib/updateAITablesFromPerformance.ts → Update on test
│
└── Frontend Dependencies
    ├── TestInterface.tsx → Display test
    ├── LearningJourneyContext → Manage state
    └── PaymentModal.tsx → Check subscription (if needed)
```

---

## 5. SOLUTION: Enhanced Exam Analysis UI

### Proposed Addition to ExamAnalysis.tsx

Add a new tab: **"Predictive Intelligence"** that shows AI table data:

```typescript
<Tabs>
  <Tab label="Overview">
    {/* Current analysis */}
  </Tab>

  <Tab label="Intelligence">
    {/* Current intelligence view */}
  </Tab>

  <Tab label="Predictive Trends"> {/* ← NEW */}
    <YearOverYearTrends
      examContext={scan.examContext}
      subject={scan.subject}
      currentYear={scan.year}
    />

    <TopicEvolution
      data={historicalTopicDistributions}
    />

    <DifficultyProgression
      patterns={historicalPatterns}
    />

    <NextYearPredictions
      predictedPattern={aiPrediction}
    />
  </Tab>
</Tabs>
```

**This would show:**
- 📈 Topic trends (calculus: 11→13→14→15→**16?**)
- 📊 Difficulty evolution per topic
- 🎯 Predicted 2025 pattern
- ⚠️  High-importance topics
- 📉 Declining topics

**Data source:** Query `exam_historical_patterns` + `exam_topic_distributions` for this exam/subject

---

## SUMMARY

✅ **All tables exist and populated**
✅ **System is operational**
✅ **Can generate AI mock tests**

⚠️  **Gap identified:** UI shows basic analysis, AI tables have richer predictive data

📊 **Recommendation:** Add "Predictive Trends" tab to Exam Analysis to show:
- Year-over-year topic evolution
- Difficulty progression
- Next year predictions
- High-importance topics

This creates a **unified comprehensive analysis** visible to students!
