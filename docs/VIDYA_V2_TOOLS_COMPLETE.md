# Vidya V2 - Complete Tool Architecture

**Date**: January 29, 2026
**Total Tools**: 11 action-based tools

---

## 🎯 Architecture Principle

**Tools are for ACTIONS, not queries. Gemini reasons with raw data in context.**

### What Gets a Tool (✅)
- **Actions that change state** - Delete, create, navigate, export
- **Backend API calls** - Fetch data from Redis, save to database
- **UI operations** - Navigate views, trigger workflows
- **External operations** - Can't be done with just reasoning

### What Doesn't Need a Tool (❌)
- **Queries on existing data** - "Show me hard questions"
- **Ranking/Filtering** - Gemini can rank from context data
- **Calculations** - Average scores, topic distribution
- **Text analysis** - Reading and understanding content

---

## 📋 Complete Tool Registry

### 1. NAVIGATION TOOLS

#### `navigateTo`
**Purpose**: Navigate to different sections of the app
**Parameters**: `view` (mastermind | analysis | sketches | lessons | vault | rapid-recall | training)
**Action**: Changes the active view in God Mode
**Backend API**: None (state change only)

```typescript
// Example usage by Gemini:
User: "Show me the exam analysis"
Gemini calls: navigateTo({ view: "analysis" })
```

---

### 2. SCANNING TOOLS

#### `scanPaper`
**Purpose**: Trigger paper scanning workflow
**Parameters**: None
**Action**: Navigates to Board Mastermind and opens upload interface
**Backend API**: None (triggers UI workflow)

#### `filterScans`
**Purpose**: Filter scanned papers by criteria
**Parameters**:
- `subject` (optional): Math | Physics | Chemistry | Biology
- `grade` (optional): Grade level
- `dateFrom` (optional): Start date
- `dateTo` (optional): End date

**Action**: Filters the scan list in app context
**Backend API**: None (client-side filtering)

---

### 3. ANALYSIS TOOLS

#### `generateInsights`
**Purpose**: Analyze scans and generate visualizations
**Parameters**: `analysisType` (topic_distribution | difficulty_trends | subject_breakdown | scan_frequency)
**Action**: Generates aggregate insights from scan data
**Backend API**: None (computes from context data)

**Returns**: Rich insight data with charts for VidyaMessageBubble

```typescript
// Returns insight_card message with:
{
  title: "Topic Distribution",
  metrics: [...],
  chart: { type: "bar", data: [...] },
  insights: ["Algebra appears in 80% of scans", ...]
}
```

---

### 4. CONTENT CREATION TOOLS

#### `createLesson`
**Purpose**: Open lesson creator with pre-filled data
**Parameters**:
- `topic` (optional): Topic name
- `subject` (optional): Subject
- `grade` (optional): Grade level
- `fromScan` (optional): Scan ID to base lesson on

**Action**: Opens LessonCreator modal with prefilled data
**Backend API**: None (opens UI component)

#### `generateSketches`
**Purpose**: Navigate to sketch generation view
**Parameters**:
- `scanId`: Scan to generate sketches for
- `questionIds` (optional): Specific questions

**Action**: Navigates to Sketch Gallery and selects scan
**Backend API**: None (triggers UI workflow, actual generation done in component)

---

### 5. EXPORT TOOLS

#### `exportData`
**Purpose**: Export analysis data in various formats
**Parameters**:
- `format`: pdf | json | csv
- `dataType`: scan_analysis | all_scans | insights | session_summary

**Action**: Generates and downloads export file
**Backend API**: None currently (placeholder - needs implementation)

---

### 6. DATA MANAGEMENT TOOLS (NEW - Backend Integrated)

#### `deleteScan`
**Purpose**: Delete a scan from the system
**Parameters**: `scanId`
**Action**: Removes scan from Redis and memory cache
**Backend API**: `DELETE /api/scans/:id`

**Use Cases**:
- "Delete the Math 10th grade scan"
- "Remove all Physics scans from last month" (calls tool multiple times)

#### `clearSolutions`
**Purpose**: Clear solution data while keeping scan structure
**Parameters**: None
**Action**: Removes cached solutions for regeneration
**Backend API**: `POST /api/cache/clear-solutions`

**Use Cases**:
- "Clear all solutions so I can regenerate them"
- "Reset solution cache"

#### `updateScan`
**Purpose**: Save updated scan data to backend
**Parameters**: `scanId`
**Action**: Syncs scan to Redis
**Backend API**: `POST /api/scans`

**Use Cases**:
- After sketch generation completes
- After manual edits to questions
- When syncing local changes

#### `fetchFlashcards`
**Purpose**: Retrieve cached flashcards for a scan
**Parameters**: `scanId`
**Action**: Fetches flashcard data from backend
**Backend API**: `GET /api/flashcards/:scanId`

**Returns**: Flashcard data if exists

**Use Cases**:
- "Show me flashcards for this scan"
- "Are there any flashcards available?"

---

## 🧠 Why This Architecture Works

### Example 1: Query (No Tool Needed)
```
User: "Rank the top 2 hardest questions"

Context already contains:
1. Q1: Algebra - Difficulty: Easy (2 marks)
2. Q2: Calculus - Difficulty: Hard (5 marks)
3. Q3: Geometry - Difficulty: Medium (3 marks)
4. Q4: Trigonometry - Difficulty: Hard (6 marks)

Gemini reasons with the data:
- Filters: Q2 and Q4 are "Hard"
- Ranks by marks: Q4 (6) > Q2 (5)
- Responds: "The top 2 hardest questions are..."

✅ No tool needed - Gemini is smart!
```

### Example 2: Action (Tool Required)
```
User: "Delete all Chemistry scans from last year"

1. Gemini uses filterScans to find matching scans
2. For each match, calls deleteScan tool
3. Each call hits: DELETE /api/scans/:id
4. Backend removes from Redis
5. Responds: "Deleted 5 Chemistry scans from 2025"

✅ Tool needed - requires backend API call
```

### Example 3: Combined Intelligence
```
User: "Which scan has the most hard questions? Generate sketches for it."

1. Gemini reads all scans from context
2. Counts "Hard" questions per scan (reasoning, no tool)
3. Finds: "Physics Grade 12 - Dec 2025" has 15 hard questions
4. Calls generateSketches tool with that scanId
5. Navigates to Sketch Gallery

✅ Query + Action - uses reasoning THEN tool
```

---

## 📊 Tool Usage Statistics

| Category | Tools | Backend API Calls | Pure Actions |
|----------|-------|-------------------|--------------|
| Navigation | 1 | 0 | 1 |
| Scanning | 2 | 0 | 2 |
| Analysis | 1 | 0 | 1 |
| Content Creation | 2 | 0 | 2 |
| Export | 1 | 0 | 1 |
| Data Management | 4 | 4 | 0 |
| **Total** | **11** | **4** | **7** |

---

## 🔄 Backend API Coverage

### Implemented API Endpoints
✅ `GET /api/scans` - Fetch all scans (used in app initialization)
✅ `POST /api/scans` - Save/update scan → **updateScan tool**
✅ `DELETE /api/scans/:id` - Delete scan → **deleteScan tool**
✅ `GET /api/flashcards/:scanId` - Get flashcards → **fetchFlashcards tool**
✅ `POST /api/flashcards` - Save flashcards (not exposed as tool yet)
✅ `POST /api/cache/clear-solutions` - Clear solutions → **clearSolutions tool**
✅ `GET /api/questionbank/:key` - Get question bank (not needed, data in context)
✅ `POST /api/questionbank` - Save question bank (not exposed as tool yet)

### Potential Future Tools
- `saveFlashcards` - Generate and save flashcards for a scan
- `saveQuestionBank` - Generate and cache question bank
- `bulkDeleteScans` - Delete multiple scans at once
- `exportToNotion` - Export to external platforms
- `scheduleReport` - Schedule automated reports

---

## 🎨 How Gemini Uses Tools

### Decision Tree

```mermaid
User Query
    ↓
Does it require STATE CHANGE or BACKEND API?
    ↓                              ↓
   YES                             NO
    ↓                              ↓
Use Tool                    Reason with Context Data
    ↓                              ↓
- Navigate                   - Rank questions
- Delete                     - Filter by topic
- Update                     - Calculate averages
- Export                     - Analyze trends
- Create                     - Answer questions
```

---

## ✨ Key Advantages

1. **Gemini stays intelligent** - Not reduced to a parameter router
2. **Fewer tools = faster responses** - Less overhead in function calling
3. **Context-rich responses** - Gemini sees the actual data
4. **Natural language flexibility** - Can handle variations without new tools
5. **Backend integration** - Tools only where APIs are needed

---

## 📝 Example Conversations

### Smart Query Handling
```
User: "What are the easiest 3 questions on current page?"
Gemini: [Reads question list from context]
        "The 3 easiest questions are:
         1. Q5: Basic Algebra (Easy, 1 mark)
         2. Q3: Simple Geometry (Easy, 2 marks)
         3. Q8: Arithmetic (Easy, 2 marks)"
Tools used: 0 ✅
```

### Action Execution
```
User: "Delete the oldest Math scan"
Gemini: [Reads scan list from context]
        [Finds: "Math Grade 10 - Jan 2025" is oldest]
        [Calls: deleteScan({ scanId: "scan-123" })]
        "Deleted 'Math Grade 10 - Jan 2025' from your system."
Tools used: 1 (deleteScan) ✅
```

### Complex Workflow
```
User: "Find scans with more than 20 questions and generate sketches for the Physics ones"
Gemini: [Reads all scans from context]
        [Filters: >20 questions AND subject=Physics]
        [Finds 2 matching scans]
        [Calls generateSketches for scan1]
        [Calls generateSketches for scan2]
        "Found 2 Physics scans with 20+ questions. Starting sketch generation..."
Tools used: 2 (generateSketches × 2) ✅
```

---

## 🚀 What Makes This Industry-Best

✅ **Smart context injection** - Gemini gets detailed data, not summaries
✅ **Action-oriented tools** - Only for state changes and APIs
✅ **Natural language reasoning** - Handles complex queries without tools
✅ **Backend integration** - Direct API calls where needed
✅ **Extensible** - Easy to add new actions as tools
✅ **Efficient** - Minimal function calling overhead

**This is what makes Vidya a true AI assistant, not just a fancy menu system.**
