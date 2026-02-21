# How to View Predictive Trends Analysis

## Quick Start

### 1. Restart Your Server
```bash
# Stop current server (Ctrl+C)
# Then start fresh:
npm run dev
```

**Why?** The new trends API endpoints were added to `server-supabase.js` but require a server restart to activate.

### 2. Navigate to Trends - TWO WAYS

#### Option A: For Students (Learning Journey)

1. **Start Learning Journey**: Click "Start Learning" or "Learning Journey" from dashboard
2. **Select Subject**: Choose exam (e.g., KCET) and subject (e.g., Math)
3. **Go to Past Year Exams**: Click "Past Year Exams" from subject menu
4. **Click "TRENDS" Button**: Toggle between "Papers" and "Trends" in header

```
┌────────────────────────────────────────┐
│  Past Year Exams                       │
│  Math • KCET                           │
│                                        │
│  ┌─────────┬─────────┐                │
│  │ PAPERS  │ TRENDS  │ ← Click here   │
│  └─────────┴─────────┘                │
└────────────────────────────────────────┘
```

#### Option B: For Admin/Teachers (Exam Analysis)

**From Dashboard:**
1. Click on any uploaded past year paper/scan
2. You'll be taken to the Exam Analysis page

**From Sidebar:**
1. Click "Exam Analysis" or "Previous Papers"
2. Select a scan
3. Click the "TRENDS" tab (3rd tab)

```
┌─────────┬──────────────┬─────────┬───────┐
│ Overview │ Intelligence │ TRENDS  │ Vault │
└─────────┴──────────────┴─────────┴───────┘
                            ↑
                    CLICK THIS TAB
```

The Trends tab has a **TrendingUp** 📈 icon.

---

## What You'll See

### Section 1: Header Statistics (4 Cards)

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 📅 Years     │ │ 🎯 Topics    │ │ 📈 Increasing│ │ 🏆 High      │
│    Analyzed  │ │    Tracked   │ │    Topics    │ │    Priority  │
│              │ │              │ │              │ │              │
│      5       │ │      7       │ │      3       │ │      4       │
│ 2019 - 2023  │ │ Across years │ │ Growing      │ │ 12+ questions│
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Section 2: Year-over-Year Difficulty Distribution

**Bar Chart** showing how difficulty levels changed across years:
- Green bars = Easy questions %
- Yellow bars = Moderate questions %
- Red bars = Hard questions %
- Stacked to show total = 100%

Example:
```
100% ┤
     │  ████ ████ ████ ████ ████
 80% │  ████ ████ ████ ████ ████  ← Hard (Red)
 60% │  ████ ████ ████ ████ ████
     │  ████ ████ ████ ████ ████  ← Moderate (Yellow)
 40% │  ████ ████ ████ ████ ████
     │  ████ ████ ████ ████ ████  ← Easy (Green)
 20% │  ████ ████ ████ ████ ████
  0% └─────────────────────────────
      2019 2020 2021 2022 2023
```

### Section 3: Topic Evolution & Predictions Table

This is the **main analysis table**:

| Topic              | Trend      | Importance | Avg | 2023 | 2024 Prediction | Change |
|-------------------|------------|-----------|-----|------|-----------------|---------|
| **Calculus**      | ↑ Incr     | High      | 13  | 15   | ⚡ **16**       | +4      |
| **Algebra**       | — Stable   | Medium    | 10  | 10   | ⚡ **10**       | 0       |
| **Coordinate Geo**| ↑ Incr     | High      | 12  | 14   | ⚡ **15**       | +3      |
| **Statistics**    | ↓ Decr     | Medium    | 9   | 7    | ⚡ **6**        | -3      |
| **Trigonometry**  | — Stable   | Medium    | 8   | 8    | ⚡ **8**        | 0       |

**Column Meanings:**
- **Topic**: Subject area (from topic_metadata)
- **Trend**:
  - ↑ Increasing = Growing >0.5 questions/year
  - ↓ Decreasing = Shrinking <-0.5 questions/year
  - — Stable = Relatively constant
- **Importance**:
  - High = 12+ questions avg
  - Medium = 8-12 questions avg
  - Low = <8 questions avg
- **Avg**: Average questions across all years
- **2023**: Latest year count
- **2024 Prediction**: AI prediction with ⚡ icon
- **Change**: Total change from first to last year

**Interactive:** Click any row to see detailed evolution chart!

### Section 4: Detailed Topic Chart (Click to View)

When you click a topic row, you'll see:

**Line Chart** showing question count evolution:
- **Blue line (thick)**: Total questions per year
- **Green line**: Easy questions
- **Yellow line**: Moderate questions
- **Red line**: Hard questions

Example for Calculus:
```
20 ┤
   │                          ●   ← Total: 15 (2023)
15 │                      ●
   │                  ●
10 │              ●
   │          ●
 5 │      ●                       ← Total: 11 (2019)
   │
 0 └──────────────────────────────
   2019  2020  2021  2022  2023
```

**Prediction Explanation Box** below chart:
```
┌─────────────────────────────────────────────────────┐
│ Prediction for 2024: 16 questions                  │
│                                                     │
│ Increasing trend (+4 over 5 years)                 │
└─────────────────────────────────────────────────────┘
```

### Section 5: Smart Study Recommendations

**Two columns:**

**Left: 🔥 High Priority Topics**
- Topics with 12+ average questions
- Should be your primary focus
- Example:
  ```
  🔴 Calculus (13Q avg)
  🔴 Coordinate Geometry (12Q avg)
  🔴 Algebra (12Q avg)
  ```

**Right: 📈 Growing Topics**
- Topics showing upward trend
- Increasing in importance
- Example:
  ```
  ↑ Calculus (+4 questions)
  ↑ Coordinate Geometry (+3 questions)
  ↑ Vectors (+2 questions)
  ```

---

## Verify the API Works

Before viewing in UI, test the API endpoint:

```bash
curl http://localhost:9001/api/trends/historical/KCET/Math | jq
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "patterns": [...],
    "topicTrends": {...},
    "predictions": {...},
    "yearsAvailable": [2019, 2020, 2021, 2022, 2023],
    "latestYear": 2023
  }
}
```

**If you see an error:** Server needs restart (see Step 1 above)

---

## Troubleshooting

### "No Historical Data Available" Message

**Causes:**
1. Server not running → Start with `npm run dev`
2. Server not restarted after adding endpoints → Restart server
3. No scanned papers for this exam/subject → Upload past year papers
4. Scan missing year/exam/subject metadata → Check scan data

**How to check scan metadata:**
```sql
-- In Supabase SQL Editor
SELECT id, year, exam_context, subject
FROM scans
WHERE year IS NOT NULL;
```

### API Returns Empty Data

**Fix:** Upload more past year papers:
- Need at least 2 years of data for meaningful trends
- Upload papers with proper metadata (year, exam, subject)

### Tab Not Visible

**Check:**
1. You're in Exam Analysis page (not Dashboard)
2. You're not in "vault only" mode
3. ExamAnalysis.tsx has the trends tab (line 1006)

---

## Data Requirements

For the Trends tab to show meaningful analysis, you need:

**Minimum:**
- ✅ 2 years of scanned past papers
- ✅ Questions mapped to topics (auto-mapping runs on upload)
- ✅ Year, exam context, and subject set on scans

**Optimal:**
- ✅ 3-5 years of past papers (better predictions)
- ✅ All questions have difficulty levels
- ✅ Topics are standardized (use topic_metadata IDs)

---

## Files Reference

**UI Component:**
- `components/PredictiveTrendsTab.tsx` - Main trends display

**API Endpoints:**
- `api/trendsEndpoints.js` - Trends calculation logic
- Registered in `server-supabase.js` lines 1608, 1614

**Database Tables Used:**
- `exam_historical_patterns` - Year-by-year patterns
- `exam_topic_distributions` - Questions per topic per year
- `topic_metadata` - Official topic list
- `questions` - Source of truth for all analysis

---

## Quick Test Checklist

- [ ] Server restarted
- [ ] Navigate to Exam Analysis page
- [ ] See 4 tabs (Overview, Intelligence, Trends, Vault)
- [ ] Click "Trends" tab
- [ ] See header statistics
- [ ] See year-over-year chart
- [ ] See topic evolution table
- [ ] Click a topic row to see detailed chart
- [ ] See study recommendations at bottom

---

## Next Steps

Once you verify the Trends tab is working:

1. **Upload more past papers** to improve predictions
2. **Check accuracy** as new exam papers come out
3. **Use predictions** to prioritize study topics
4. **Share with students** to guide their preparation

---

**Questions or Issues?**
Check `docs/IMPLEMENTATION_COMPLETE.md` for complete technical details.
