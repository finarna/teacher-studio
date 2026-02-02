# Exam Analysis - Data Flow Documentation

## Critical Fix Applied
**Issue**: Question text and other content were not displaying
**Root Cause**: `RenderWithMath` component expects `text` prop but was being called with `content` prop
**Fix**: Changed all `<RenderWithMath content={...} />` to `<RenderWithMath text={...} />`

---

## Overview Tab - Real Data Display

### Current Scan Banner
- **Name**: `scan.name` (e.g., "03-KCET-BOARD-EXAM-MATHS-16-06-2022-M1[23:04]")
- **Subject**: `scan.subject` (e.g., "Math")
- **Grade**: `scan.grade` (e.g., "Class 12")
- **Date**: `scan.date`
- **Question Count**: `questions.length`
- **Total Marks**: Sum of all `question.marks`

### Metric Cards
1. **Synthesized Fragments**: `questions.length`
2. **Portfolio Source**: `allScans.length` (number of papers in portfolio)
3. **Cognitive Weight**: Total marks across all questions
4. **AI Fidelity**: "99.2%" (static)

### Instructional Strategist
- **Summary**: `analysis.summary` - AI-generated overview
- **Professor Insights**: Auto-generated from `professorInsights` array
  - Rigor inflation detection
  - Cognitive threshold analysis
  - Mathematical friction assessment
  - Compound question density

### Longitudinal Cognitive Drift
- **When**: Shows only if `allScans.length > 1`
- **Chart Type**: Line chart
- **Data**: `topicTrendData` - domain marks across papers
- **Lines**: One per domain (Mechanics, Thermodynamics, etc.)

### Professional Insights Grid
- **Papers**: All scans in `portfolioStats`
- **Metrics per paper**:
  - Complexity Index: % of hard questions
  - Math Density: % of calculus/algebra questions
  - Distribution: Easy/Moderate/Hard percentages
  - Difficulty Badge: "Rigorous" (>40% hard) or "Balanced"

### Portfolio Snapshot Sidebar
- **Papers**: All scans in `portfolioStats`
- Shows: Name, date, total marks

### Predictive Mapping
- **Source**: `analysis.predictiveTopics`
- **Display**: Top 5 topics with probability bars

### Strategic Analysis Matrix Table
- **Rows**: One per `aggregatedDomains`
- **Columns**:
  - Category Cluster: Domain name
  - High-Yield Tracks: Top 3 chapters
  - Marks: Total marks in domain
  - Cognitive DNA: Dominant Bloom's level
  - Control Point: Difficulty badge (Easy/Moderate/Hard)

---

## Intelligence Tab - Real Data Display

### Current Scan Banner
- **Name**: `scan.name`
- **Domain Count**: `aggregatedDomains.length`
- **Question Count**: `questions.length`
- **Portfolio Size**: `portfolioStats.length`

### Domain Weightage Distribution Chart
- **Multi-paper mode**: Line chart showing domain trends
- **Single paper mode**: Bar chart showing domain marks
- **Data**: `topicTrendData` or `aggregatedDomains`

### Domain Legend
- **Domains**: All from `aggregatedDomains`
- **Display**: Color dot, name, marks

### Cognitive Distribution (Sidebar)
- **Source**: `analysis.bloomsTaxonomy`
- **Display**: Progress bars with percentages
- **Bloom's Levels**: Remember, Understand, Apply, Analyze, Evaluate, Create

### Chapter High-Yields (Sidebar)
- **Source**: `analysis.chapterInsights`
- **Display**: Top 3 chapters with:
  - Name
  - Insight text
  - Difficulty badge

### Fidelity Assurance
- **Content**: Static message about AI cross-verification

---

## Vault Tab - Real Data Display

### Current Scan Stats Banner
- **Name**: `scan.name`
- **Subject**: `scan.subject`
- **Grade**: `scan.grade`
- **Total Questions**: `questions.length`
- **Solved**: Count of questions with `solutionSteps.length > 0`
- **Visuals**: Count of questions with `sketchSvg`
- **Filtered**: `filteredQuestions.length` (based on search)

### Left Sidebar - Question List

#### List Mode
- **Questions**: All from `filteredQuestions`
- **Display per question**:
  - Question number badge (Q1, Q2, etc.)
  - Question text preview (2 lines, with math rendering)
  - Marks
  - Visual element indicator (blue dot if `hasVisualElement`)

#### Group Mode
- **Groups**: Organized by `aggregatedDomains`
- **Display per domain**:
  - Domain name
  - Question count + total marks
  - Difficulty badge
  - Expandable question list

### Right Panel - Question Details

#### Question Header
- **Question number**: Position in `questions` array
- **Marks**: `selectedQuestion.marks`
- **Difficulty**: `selectedQuestion.difficulty` (Easy/Moderate/Hard badge)
- **Bloom's Level**: `selectedQuestion.blooms`
- **Topic**: `selectedQuestion.topic`
- **Visual Indicator**: If `selectedQuestion.hasVisualElement`

#### Action Buttons
- **Model Selector**: Dropdown with `GEMINI_MODELS`
- **Sync Solution**: Triggers AI synthesis
- **Generate Visual**: Creates SVG sketch
- **Generate All Visuals**: Batch visual generation

#### Question Content
- **Text**: `selectedQuestion.text` (rendered with math via `RenderWithMath`)
- **Extracted Images**: Array of base64 images from `selectedQuestion.extractedImages`

#### Solution Steps
- **Shows when**: `selectedQuestion.solutionSteps.length > 0`
- **Display**: Numbered steps with math rendering

#### Mastery Material
- **Shows when**: `selectedQuestion.masteryMaterial` exists
- **Tabs**: Logic / Visual
- **Logic Tab Content**:
  - Core Concept: `masteryMaterial.coreConcept`
  - Memory Trigger: `masteryMaterial.memoryTrigger`
  - Logic: `masteryMaterial.logic`
- **Visual Tab Content**:
  - Visual Prompt: `masteryMaterial.visualPrompt`

#### Generated Visual
- **Shows when**: `selectedQuestion.sketchSvg` exists
- **Valid SVG**: Renders the SVG
- **Invalid/JSON**: Shows error message with debug info

---

## Data Source Summary

All data comes from the selected `scan` object:
- `scan.name`, `scan.subject`, `scan.grade`, `scan.date`
- `scan.analysisData.questions[]` - Array of questions
- `scan.analysisData.summary` - AI summary
- `scan.analysisData.bloomsTaxonomy[]` - Cognitive distribution
- `scan.analysisData.predictiveTopics[]` - Topic predictions
- `scan.analysisData.chapterInsights[]` - Chapter analysis

Computed from questions:
- `aggregatedDomains` - Questions grouped by domain/category
- `portfolioStats` - Multi-paper statistics
- `professorInsights` - Auto-generated insights
- `topicTrendData` - Cross-paper trend data

---

## Fix Verification

After the fix, you should see:
1. ✅ **Question text** displayed in prominent box in Vault tab
2. ✅ **Solution steps** with proper math rendering
3. ✅ **Mastery material** showing core concepts, memory triggers
4. ✅ **Question previews** in sidebar showing actual question text
5. ✅ **Overview tab** showing all metrics and insights
6. ✅ **Intelligence tab** showing charts and distributions

If content is still not showing:
- Check browser console for errors
- Verify `scan.analysisData.questions` has data
- Ensure question objects have `text` field populated
- Check that KaTeX is loaded (`window.katex` should exist)
