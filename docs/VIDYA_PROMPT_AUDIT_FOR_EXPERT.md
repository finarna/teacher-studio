# Vidya System Prompt - Expert Review Document

**Date**: January 29, 2026
**Purpose**: Audit current prompt for professional prompt engineering review
**Current State**: Unprofessional accumulation of band-aid fixes

---

## 🚨 Critical Issues

### 1. Excessive Length
- **Current**: 189 lines
- **Problem**: Cognitive overload, competing priorities, unclear focus
- **Industry Standard**: 50-80 lines for core prompt
- **Impact**: Model confusion, inconsistent behavior

### 2. Multiple "Priority" Markers
- ❌ "IMPORTANT" appears 3 times
- ❌ "CRITICAL" appears 2 times
- ❌ "**ALWAYS**" appears 4 times
- **Problem**: Everything is urgent = nothing is urgent
- **Result**: No clear behavioral hierarchy

### 3. Redundant Instructions
**Tool Usage** mentioned in:
- Line 28: "You can PERFORM ACTIONS using tools"
- Line 78: "Only use tools when you need to PERFORM AN ACTION"
- Lines 165-173: "WHEN TO USE TOOLS" (full section)
- Lines 515-519: "When to Use Tools vs Direct Response" (in context generation)

**Cross-Scan Analysis** mentioned in:
- Line 35: Core capabilities
- Lines 40-48: Dedicated section with full explanation
- Line 323: In generated context

### 4. Poor Structure
**Current Order** (illogical):
```
1. Identity
2. Core Capabilities
3. Cross-Scan Analysis Details
4. Answer Choices Explanation
5. Difficulty Analysis (5 indicators)
6. Content Generation (with example)
7. Communication Style
8. Rich Formatting (60 lines of examples!)
9. When to Use Tools
10. Boundaries
11. Insight Generation Guidelines
```

**Problems**:
- Examples embedded in core prompt (lines 82-92, 102-163)
- Details before principles
- Formatting instructions longer than core behavior
- No logical grouping

### 5. Conflicting Guidance
**Contradiction Example**:
- Line 78: "Only use tools when you need to PERFORM AN ACTION"
- Line 168: "When user asks 'how many', 'what topics' - Use generateInsights or filterScans"
- **Confusion**: "How many questions?" = query (could respond directly) OR action (use tool)?

**Result**: Model indecision, inconsistent behavior

### 6. Bloated Examples Section
**Lines 102-163** (61 lines!):
- Exhaustive formatting examples
- Should be in separate documentation
- Takes focus away from core behavior
- Includes full example response (lines 142-163)

**Problem**: Core prompt ≠ formatting guide

### 7. Band-Aid Architecture
**Evidence of Reactive Fixes**:
- Line 40: "## IMPORTANT: Cross-Scan Question Analysis" (added for issue #1)
- Line 52: "## INTELLIGENT DIFFICULTY ANALYSIS" (added for issue #2)
- Line 69: "## CONTENT GENERATION (Direct - No Tools Needed!)" (added for issue #3)

**Problem**: Each user complaint = new section, no refactoring

### 8. Verbose Explanations
**Example** (Lines 82-92):
```
**Example Response Pattern**:
User: "Give me 3 variations of this permutation question"
You: "Here are 3 variations of the MASK permutation question:

**Variation 1**: If all permutations of the letters of the word TEAM...
[11 lines of example]
```

**Problem**: Full conversation example in core prompt (should be in few-shot examples instead)

---

## 📊 Quantitative Analysis

### Line Breakdown
| Section | Lines | % of Total | Appropriate? |
|---------|-------|------------|--------------|
| Core Identity | 10 | 5% | ✅ Good |
| Capabilities | 8 | 4% | ✅ Good |
| Cross-Scan Details | 9 | 5% | ⚠️ Too detailed |
| Difficulty Analysis | 16 | 8% | ❌ Too long |
| Content Generation | 24 | 13% | ❌ Too long (includes example) |
| Communication Style | 6 | 3% | ✅ Good |
| Formatting Examples | 61 | 32% | ❌ Should be separate |
| Tool Instructions | 9 | 5% | ⚠️ Redundant |
| Boundaries | 5 | 3% | ✅ Good |
| Insight Guidelines | 7 | 4% | ✅ Good |
| **Non-core bloat** | **110** | **58%** | ❌ Remove |

**Analysis**: Over half the prompt is examples, redundancy, or excessive detail.

### Priority Markers
- "IMPORTANT" x3
- "CRITICAL" x2
- "ALWAYS" x4
- "**Bold emphasis**" x47
- All caps sections x9

**Problem**: Visual hierarchy suggests everything is critical.

---

## 🎯 Core Behavior Requirements (What We Actually Need)

### Essential Rules (Must Keep)
1. **Identity**: AI teaching assistant named Vidya, helps with EduJourney app
2. **Intelligent Analysis**: Use reasoning, not just field checks (marks, topic complexity)
3. **Content vs Actions**: Generate content directly, use tools for actions only
4. **Cross-Scan Awareness**: Can analyze across all scanned papers
5. **Rich Formatting**: Use tables, lists, math notation
6. **Conversational**: Professional but warm, concise responses
7. **Boundaries**: App-focused, no arbitrary homework solving

### Current Implementation Issues
Each rule above is:
- ❌ Explained multiple times (redundancy)
- ❌ Buried in long sections (poor visibility)
- ❌ Mixed with examples (cognitive load)
- ❌ No clear priority (everything "CRITICAL")

---

## 🔧 Specific Problems & Solutions

### Problem 1: Difficulty Analysis Section (Lines 52-67)
**Current** (16 lines):
```
## INTELLIGENT DIFFICULTY ANALYSIS
**CRITICAL**: Don't just rely on the 'difficulty' field! Use AI reasoning:

**Indicators of Difficulty**:
1. **Marks**: Higher marks (5-6) usually indicate harder questions...
2. **Topic Complexity**: Calculus/Integration/Matrices > Basic Algebra...
3. **Question Length**: Longer word problems are often more complex
4. **Multi-Step Reasoning**: Questions requiring multiple concepts...
5. **Abstract Topics**: Probability, Permutations, Proofs > Direct...

**Example**: If all questions are marked "Moderate"...
[5 more lines of examples]
```

**Should Be** (3-4 lines):
```
When analyzing question difficulty, use multi-factor reasoning:
- Assess marks allocation, topic complexity, and question structure
- Don't rely solely on difficulty labels - apply educational judgment
- Example: 6-mark Integration question is harder than 1-mark arithmetic
```

**Savings**: 16 lines → 4 lines (75% reduction)

### Problem 2: Content Generation Section (Lines 69-92)
**Current** (24 lines with full example)

**Should Be** (5-6 lines):
```
Generate educational content directly in chat (variations, explanations, study tips).
Use tools only for actions (navigate, save, export).

Decision rule:
- Content request → Respond directly
- Action request → Use appropriate tool
```

**Savings**: 24 lines → 6 lines (75% reduction)

### Problem 3: Formatting Section (Lines 101-163)
**Current** (61 lines of examples)

**Should Be**: Move to separate document or few-shot examples
**Savings**: 61 lines → 0 lines (move out of core prompt)

---

## 🏗️ Recommended Structure

### Professional Prompt Architecture
```
1. IDENTITY & MISSION (4 lines)
   - Who you are, what you do

2. CORE BEHAVIOR PRINCIPLES (12-15 lines)
   - Intelligent analysis (not just field checks)
   - Content generation vs tool usage
   - Cross-scan awareness
   - Rich formatting preference

3. RESPONSE GUIDELINES (8-10 lines)
   - Tone: conversational, concise
   - Format: tables, lists, math notation
   - Structure: clear sections, actionable insights

4. TOOL PHILOSOPHY (8-10 lines)
   - When to use: actions (navigate, save, export)
   - When to respond directly: content, explanations
   - Decision framework

5. BOUNDARIES (5-6 lines)
   - Stay app-focused
   - Don't solve arbitrary homework
   - Don't make up data

TOTAL: ~50-60 lines (vs current 189)
```

### Separation of Concerns
**Core Prompt** (50-60 lines):
- Identity
- Behavior principles
- Decision rules

**Separate Documents**:
- Formatting examples
- Few-shot conversation examples
- Detailed topic hierarchies
- Edge case handling

**Context Injection** (dynamic):
- Current scan data
- User role
- App state
- Recent activity

---

## 📋 User Complaints That Led to Band-Aids

### Issue 1: Cross-Scan Question Analysis
**User**: "Which question appears most across all scans?"
**Vidya**: "I can't access that"
**Fix Applied**: Added 9-line "IMPORTANT" section about cross-scan analysis
**Proper Solution**: Add to core capabilities (1 bullet), ensure context includes data

### Issue 2: "Looks like it's local system with no AI"
**User**: "Which is the most difficult question?"
**Vidya**: "All labeled 'Moderate', I can't tell"
**Fix Applied**: Added 16-line "INTELLIGENT DIFFICULTY ANALYSIS" section
**Proper Solution**: Add principle "use multi-factor reasoning, not just labels" (1-2 lines)

### Issue 3: Tool Overuse
**User**: "Give me 3 variations"
**Vidya**: *Opens lesson creator*
**Fix Applied**: Added 24-line "CONTENT GENERATION" section with full example
**Proper Solution**: Clarify content vs action in tool philosophy (2-3 lines)

**Pattern**: Each issue = new section, no refactoring = bloated prompt

---

## 🎓 Prompt Engineering Best Practices (Violated)

### Violated Principles
1. ❌ **Brevity**: Core prompt should be ≤100 lines
2. ❌ **Single Responsibility**: Examples should be separate from instructions
3. ❌ **Priority Hierarchy**: Not everything can be "CRITICAL"
4. ❌ **No Redundancy**: Say it once, say it well
5. ❌ **Logical Structure**: Flow from general to specific
6. ❌ **Testability**: Too long to iterate and A/B test effectively

### Correct Approach
✅ **Core principles** in prompt (what to do)
✅ **Few-shot examples** separate (how to do it)
✅ **Context injection** for dynamic data
✅ **Clear hierarchy** (essential → important → nice-to-have)
✅ **Iterative refinement** (test, measure, refine)
✅ **Separation of concerns** (prompt ≠ documentation)

---

## 💡 Expert Review Questions

### For Prompt Engineer to Consider
1. **Optimal Length**: What's the sweet spot for this use case? (50-80 lines?)
2. **Few-Shot Strategy**: Should formatting examples be few-shot instead of embedded?
3. **Priority System**: How to handle multiple important behaviors without "everything is critical"?
4. **Context Balance**: What belongs in prompt vs dynamic context injection?
5. **Tool Calling**: Best practice for content vs action decision-making?
6. **Testing Framework**: How to A/B test prompt variations systematically?
7. **Evaluation Metrics**: What should we measure? (task completion, coherence, tool usage accuracy?)

### Success Criteria
After rewrite, Vidya should:
- ✅ Respond intelligently to all previous failing queries
- ✅ Use tools appropriately (not overuse/underuse)
- ✅ Generate content when asked (not default to tools)
- ✅ Apply reasoning (not just check database fields)
- ✅ Maintain conversational, helpful tone
- ✅ Stay within app boundaries

---

## 📁 Supporting Documents

### Files to Review
1. **Current Prompt**: `/utils/vidyaContext.ts` (lines 24-189)
2. **Context Generation**: `/utils/vidyaContext.ts` (lines 195-550)
3. **Tool Declarations**: `/utils/vidyaTools.ts`
4. **Recent Fix Documentation**:
   - `docs/VIDYA_V3_GEMINI_CONTEXT_FIX.md`
   - `docs/VIDYA_CONTENT_GENERATION_FIX.md`
   - `docs/VIDYA_INTELLIGENT_DIFFICULTY_ANALYSIS.md`

### User Scenarios to Test Against
1. "Which question appears most across all scans?" (cross-scan analysis)
2. "Which is the most difficult question?" (intelligent analysis)
3. "Give me 3 variations of this question" (content generation)
4. "What were the answer choices for that question?" (data access)
5. "Save these to a lesson" (appropriate tool use)

---

## ✅ Next Steps

### For Expert Reviewer
1. Review this audit document
2. Analyze current prompt (lines 24-189 in vidyaContext.ts)
3. Propose professional prompt structure
4. Define few-shot example strategy
5. Establish testing/evaluation framework

### For Development Team
1. Implement approved prompt rewrite
2. Move examples to separate few-shot system
3. Create A/B testing framework
4. Define metrics for prompt performance
5. Establish refinement process (not band-aid accumulation)

---

## 📊 Summary

**Current State**: Unprofessional, bloated prompt with 58% non-core content
**Root Cause**: Reactive band-aid fixes instead of proper prompt engineering
**Impact**: Inconsistent behavior, model confusion, maintenance nightmare
**Solution**: Complete rewrite with professional structure and clear hierarchy
**Success Metric**: Same capability, 70% fewer lines, better consistency

**The user was right**: You can't keep adding things. Time for professional prompt engineering. 🎯
