# AI Auto-Update System - Complete Architecture

## System Overview

The AI question generator automatically learns from:
1. **Past year papers** (scans) → Updates exam patterns
2. **Student performance** (test results) → Updates personalized profiles

This is a **self-improving system** with ZERO manual data entry.

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA SOURCES                                 │
├────────────────────────────┬────────────────────────────────────┤
│  📄 Scanned Papers         │  👥 Student Test Results           │
│  (Past Year Questions)     │  (Mock Test Performance)           │
└─────────────┬──────────────┴──────────────┬─────────────────────┘
              │                             │
              ▼                             ▼
      ┌───────────────┐            ┌──────────────────┐
      │ questions     │            │ test_responses   │
      │ table         │            │ table            │
      │ (240 rows)    │            │ (per test)       │
      └───────┬───────┘            └────────┬─────────┘
              │                             │
              │ Auto-mapped                 │ Calculated
              │ to topics                   │ per topic
              │                             │
              ▼                             ▼
    ┌──────────────────────┐      ┌────────────────────────┐
    │ syncScanToAITables() │      │ updateStudentPerf      │
    │                      │      │ ormanceProfile()       │
    └──────────┬───────────┘      └────────┬───────────────┘
               │                           │
               └─────────┬─────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   AI GENERATOR        │
              │   TABLES              │
              ├───────────────────────┤
              │ exam_historical_      │
              │   patterns            │
              │ exam_topic_           │
              │   distributions       │
              │ student_performance_  │
              │   profiles            │
              └───────────┬───────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │ AI Question  │
                  │ Generator    │
                  │ (Gemini API) │
                  └──────────────┘
```

---

## Database Tables

### Source Tables (Existing)

#### 1. `scans` table
Stores uploaded exam papers.
```sql
- id: UUID
- year: TEXT (e.g., "2021", "2024")
- exam_context: TEXT ("KCET", "JEE", etc.)
- subject: TEXT ("Math", "Physics", etc.)
- difficulty_distribution: JSONB (UI display - often empty)
- topic_weightage: JSONB (UI display - often empty)
- analysis_data: JSONB (UI display data)
```

**Note:** These JSONB fields are for UI display. The AI tables use normalized data from `questions` table.

#### 2. `questions` table
Individual questions extracted from scans.
```sql
- id: TEXT
- scan_id: UUID (FK → scans.id)
- topic: TEXT (mapped to official topic_id)
- difficulty: TEXT ("Easy", "Moderate", "Hard")
- marks: INTEGER
- blooms: TEXT ("Understand", "Apply", etc.)
```

**This is the SOURCE OF TRUTH for AI table updates.**

#### 3. `test_responses` table
Student answers to questions.
```sql
- attempt_id: UUID
- question_id: TEXT
- is_correct: BOOLEAN
- topic: TEXT
- difficulty: TEXT
- time_spent: INTEGER
```

---

### AI Generator Tables (For Predictions)

#### 1. `exam_historical_patterns`
Overall exam statistics per year.

```sql
CREATE TABLE exam_historical_patterns (
  id UUID PRIMARY KEY,
  year INTEGER NOT NULL,
  exam_context TEXT NOT NULL,
  subject TEXT NOT NULL,
  total_marks INTEGER,
  difficulty_easy_pct INTEGER,      -- % of easy questions
  difficulty_moderate_pct INTEGER,  -- % of moderate questions
  difficulty_hard_pct INTEGER,      -- % of hard questions
  created_at TIMESTAMPTZ,
  UNIQUE(year, exam_context, subject)
);
```

**Example:**
| year | exam | subject | total_marks | easy% | moderate% | hard% |
|------|------|---------|-------------|-------|-----------|-------|
| 2024 | KCET | Math    | 60          | 40    | 45        | 15    |
| 2023 | KCET | Math    | 60          | 42    | 43        | 15    |

**Populated by:** `syncScanToAITables()` after scan upload

---

#### 2. `exam_topic_distributions`
Questions per topic per year.

```sql
CREATE TABLE exam_topic_distributions (
  id UUID PRIMARY KEY,
  historical_pattern_id UUID (FK → exam_historical_patterns.id),
  topic_id TEXT NOT NULL,
  question_count INTEGER,
  average_marks NUMERIC,
  difficulty_easy_count INTEGER,
  difficulty_moderate_count INTEGER,
  difficulty_hard_count INTEGER,
  created_at TIMESTAMPTZ
);
```

**Example:**
| year | exam | subject | topic_id  | questions | easy | moderate | hard |
|------|------|---------|-----------|-----------|------|----------|------|
| 2024 | KCET | Math    | calculus  | 15        | 6    | 7        | 2    |
| 2024 | KCET | Math    | algebra   | 12        | 4    | 6        | 2    |
| 2023 | KCET | Math    | calculus  | 13        | 5    | 6        | 2    |

**Populated by:** `syncScanToAITables()` after scan upload

---

#### 3. `student_performance_profiles`
Individual student performance tracking.

```sql
CREATE TABLE student_performance_profiles (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  exam_context TEXT NOT NULL,
  subject TEXT NOT NULL,
  overall_accuracy INTEGER DEFAULT 50,    -- 0-100%
  total_tests_taken INTEGER DEFAULT 0,
  topic_performance JSONB DEFAULT '{}',   -- Per-topic stats
  weak_areas TEXT[] DEFAULT '{}',         -- Topics < 60%
  strong_areas TEXT[] DEFAULT '{}',       -- Topics >= 80%
  last_test_date TIMESTAMPTZ,
  UNIQUE(user_id, exam_context, subject)
);
```

**Example:**
```json
{
  "user_id": "user-123",
  "exam_context": "KCET",
  "subject": "Math",
  "overall_accuracy": 72,
  "total_tests_taken": 5,
  "topic_performance": {
    "calculus": {
      "accuracy": 65,
      "questions_attempted": 30,
      "questions_correct": 19
    },
    "algebra": {
      "accuracy": 80,
      "questions_attempted": 25
    }
  },
  "weak_areas": ["calculus", "trigonometry"],
  "strong_areas": ["algebra", "vectors"]
}
```

**Populated by:** `updateStudentPerformanceProfile()` after test submission

---

## Code Components

### 1. Scan Upload → AI Tables

**File:** `lib/syncScanToAITables.ts`

**When:** Called after scan upload + question auto-mapping

**What it does:**
1. Reads `questions` table for the scan
2. Calculates difficulty distribution (% Easy/Moderate/Hard)
3. Groups questions by topic
4. Upserts `exam_historical_patterns` (overall exam stats)
5. Deletes old `exam_topic_distributions` for this pattern
6. Inserts new topic distributions

**Integration point:** `server-supabase.js` lines ~638, ~705
```javascript
const { syncScanToAITables } = await import('./lib/syncScanToAITables.ts');
const syncResult = await syncScanToAITables(supabaseAdmin, scanId);
```

**Example output:**
```
📊 Syncing scan dac6f8c8-46a9-4094-83bc-eaaa0afff451...
   Found 240/240 questions mapped to topics
   Topics covered: calculus, algebra, trigonometry, ...
   ✅ Updated exam_historical_patterns (ID: 99e5db98...)
   ✅ Updated 13 topic distributions
   Year: 2021, Exam: KCET Math
   Total Questions: 240 (240 mapped)
   Difficulty: Easy=56 Moderate=148 Hard=36
```

---

### 2. Test Completion → Student Profile

**File:** `lib/updateAITablesFromPerformance.ts`

**When:** Called after test submission (async, non-blocking)

**What it does:**
1. Receives topic-wise performance from test
2. Checks if student profile exists
3. If exists: Updates with moving average
4. If new: Creates profile
5. Identifies weak areas (< 60% accuracy)
6. Identifies strong areas (>= 80% accuracy)

**Integration point:** `api/learningJourneyEndpoints.js` line ~496
```javascript
import('../lib/updateAITablesFromPerformance.ts')
  .then(({ updateStudentPerformanceProfile }) => {
    return updateStudentPerformanceProfile(
      supabaseAdmin, userId, examContext, subject,
      topicStats, percentage
    );
  });
```

**Example output:**
```
📈 Updating performance profile for user user-123...
   Exam: KCET Math
   Topics: 5
   Overall Accuracy: 72%
   Weak areas: calculus, trigonometry
   Strong areas: algebra, vectors
✅ Profile updated with 5 topics
```

---

## AI Question Generation Flow

**File:** `lib/aiQuestionGenerator.ts` → `generateTestQuestions()`

**Steps:**
1. **Load context** from AI tables:
   ```typescript
   // Get historical patterns (last 4 years)
   const patterns = await loadHistoricalPatterns(examContext, subject);

   // Get student profile
   const profile = await loadStudentProfile(userId, examContext, subject);
   ```

2. **Predict next year's pattern:**
   ```typescript
   // Uses patterns to predict topic distribution
   const prediction = predictTopicDistribution(patterns);
   // Example: Calculus increasing from 11→13→14→15, predict 16 for next year
   ```

3. **Calculate allocation** (weighted formula):
   ```typescript
   const allocation = {
     predictedPattern: 0.40,    // From historical data
     studentWeakAreas: 0.30,    // From performance profile
     curriculumBalance: 0.20,   // From syllabus coverage
     recentTrends: 0.10         // From latest scans
   };
   ```

4. **Generate questions** topic by topic:
   ```typescript
   for (const topic of allocation) {
     // Adjust difficulty based on student mastery
     const difficulty = profile.topicPerformance[topic.id]?.accuracy < 60
       ? 'Easy/Moderate'   // Weak area → easier questions
       : 'Moderate/Hard';  // Strong area → challenging questions

     await generateTopicQuestions(topic, difficulty);
   }
   ```

---

## Setup & Testing

### 1. Run Migration
```bash
# Apply migration in Supabase Dashboard SQL Editor
supabase/migrations/019_student_performance_profiles.sql
```

### 2. Verify Tables Exist
```bash
npx tsx scripts/testAITableIntegration.ts
```

### 3. Test Complete Flow

**A. Upload a scan:**
1. Upload past year paper
2. AI analyzes → creates questions
3. Questions auto-mapped to topics
4. **AI tables automatically updated** ✅

**B. Complete a mock test:**
1. Student takes test
2. Submit test
3. **Performance profile automatically updated** ✅

**C. Generate new mock test:**
1. AI reads updated tables
2. Generates personalized questions
3. Uses latest exam patterns ✅

---

## File Structure

```
lib/
├── syncScanToAITables.ts          # Scan → AI tables (200 lines)
├── updateAITablesFromPerformance.ts # Tests → Student profile (247 lines)
├── examDataLoader.ts              # Load context for AI
└── aiQuestionGenerator.ts         # Generate questions with AI

supabase/migrations/
└── 019_student_performance_profiles.sql  # Migration

scripts/
├── analyzeScanDataStructure.ts    # Debug: View data structure
├── testAITableIntegration.ts      # Verify tables exist
└── testAIGeneratorOutput.ts       # Test AI generation

docs/
└── AI_AUTO_UPDATE_SYSTEM.md       # This file
```

---

## Benefits

✅ **Zero Manual Work** - Completely automatic
✅ **Self-Improving** - Learns from every scan and test
✅ **Personalized** - Adapts to individual student needs
✅ **Data-Driven** - Uses real exam patterns, not guesses
✅ **Production Ready** - Tested with real 240-question scans

---

## Summary

**ONE SOURCE OF TRUTH:** `questions` table
**TWO UPDATE PATHS:** Scans + Tests
**THREE AI TABLES:** Patterns + Distributions + Profiles
**ZERO MANUAL UPDATES:** Fully automatic

The system is clean, systematic, and production-ready.
