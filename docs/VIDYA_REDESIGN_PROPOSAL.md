# Vidya Complete Redesign - AI-First, Not Rules-First

**Date**: January 29, 2026
**Status**: 🔴 **PROPOSAL - NEEDS APPROVAL**
**Impact**: Complete architectural overhaul from rigid rules engine to clean AI assistant

---

## 🚨 The Critical Problem

### What We've Built (Current Vidya)
```
❌ 62-line system prompt (was 189)
❌ 6 behavioral principles with nested rules
❌ Mixed text + data context injection
❌ Reactive band-aid additions for every edge case
❌ Feels like hard-coded lookup system
❌ Over-specified, rigid, rules-first
```

### What You Had (Original Math Chat)
```
✅ ~30-line system instruction
✅ 4 simple rules per role (Student/Teacher)
✅ Clean JSON context injection
✅ AI-first, trust Gemini to be intelligent
✅ Quick actions for common tasks
✅ Clear, crisp, professional
```

---

## 📊 Side-by-Side Comparison

### System Instruction

#### Original Math Chat (CLEAN)
```typescript
const baseInstruction = `You are MathAI, a Next-Gen AI Assistant for an EdTech App.
Current Role: ${role === 'student' ? 'EMPATHETIC COACH & TUTOR' : 'EXPERT SME & PEDAGOGY CONSULTANT'}.

APP CONTEXT:
- You have access to the user's current question, answers, and mastery data via hidden context messages.
- ALWAYS reference this context. If the user asks "Help me", look at the 'currentQuestion' in the context.
- Output math in LaTeX: $inline$ or $block$.
- Output chemical formulas in LaTeX: \\ce{H2O}.
`;

const studentInstruction = `
STUDENT MODE RULES:
1. SOCRATIC METHOD: Never give the answer directly. Ask guiding questions.
2. ENCOURAGEMENT: Be high energy, use emojis (🚀, 💡, ✨), and be supportive.
3. HINTS: If asked for a hint, give a conceptual clue, not a calculation step.
4. ERRORS: If they answered wrong, explain *why* that specific option is incorrect.
`;

const teacherInstruction = `
TEACHER MODE RULES:
1. PROFESSIONALISM: Be concise, analytical, and professional.
2. PEDAGOGY: Focus on learning objectives, common misconceptions (traps), and teaching strategies.
3. ANALYTICS: When asked about progress, analyze the 'masteryData' deeply. Suggest remedial actions.
4. CONTENT GENERATION: If asked, generate similar questions or lesson plans.
`;
```

**Total**: ~25 lines, crystal clear

#### Current Vidya (BLOATED)
```typescript
const VIDYA_CORE_PROMPT = `You are Vidya (Sanskrit for "knowledge"), an AI teaching assistant...

CORE CAPABILITIES
You can analyze scanned exam papers, identify question patterns...

BEHAVIORAL PRINCIPLES

1. Intelligent Analysis Over Field Checking
   Apply reasoning to determine question difficulty using marks allocation...

2. Content vs Action Decision
   - Generate content directly: question variations...
   - Use tools for actions...

3. Cross-Scan Intelligence
   You can analyze questions across ALL scanned papers...

4. Data-Driven Insights
   Always cite specific numbers...

5. Educational Value & Source Attribution
   Provide detailed, educational responses...

6. Intelligent Intent Recognition
   Don't refuse requests just because you don't recognize the exact feature name...

RESPONSE GUIDELINES
...
TOOL USAGE FRAMEWORK
...
BOUNDARIES
...
`;
```

**Total**: 62 lines (was 189), complex maze of rules

---

### Context Injection

#### Original Math Chat (STRUCTURED)
```typescript
const contextPayload = {
  role: userRole,
  currentView: context.activeView,
  currentQuestionId: context.currentQuestion?.id,
  currentQuestionText: context.currentQuestion?.text,
  userSelectedOption: context.currentQuestion ? context.userAnswers[context.currentQuestion.id] : null,
  isSubmitted: context.isSubmitted,
  weakAreas: Object.values(context.masteryData).filter(t => t.masteryScore < 60).map(t => t.topic)
};

const promptWithContext = `
[SYSTEM_CONTEXT_DATA]
${JSON.stringify(contextPayload)}
[/SYSTEM_CONTEXT_DATA]

User Query: ${textToSend}
`;
```

**Clean JSON in delimiters** - Gemini knows exactly what's data vs query

#### Current Vidya (TEXT DUMP)
```typescript
let context = '\n\n# LIVE APP STATE (Use this structured data to answer queries)\n';
context += `\n## Current View: ${this.appContext.currentView}\n`;
context += `\n**IMPORTANT**: You have access to ALL the data below...\n`;
context += `\n## Scanned Papers\n`;
context += `- **Total: ${scans.length} papers**\n`;
context += `- Recent scans (latest 5, chronologically ordered):\n`;
// ... 200+ more lines of mixed text descriptions
```

**Text descriptions, verbose explanations** - confusing for AI to parse

---

### Quick Actions

#### Original Math Chat (CONTEXT-AWARE)
```typescript
const getQuickActions = () => {
  const actions = [];
  if (userRole === 'student') {
    if (context.currentQuestion) {
      actions.push({
        label: `Hint for Q${context.currentQuestion.id}`,
        prompt: `I am stuck on Question ${context.currentQuestion.id}. Can you give me a conceptual hint without solving it?`
      });
      actions.push({
        label: `Explain Concept`,
        prompt: `What are the underlying concepts for Question ${context.currentQuestion.id}?`
      });
    }
  } else {
    // Teacher Actions
    actions.push({
      label: `Lesson Plan for Q${context.currentQuestion.id}`,
      prompt: `Create a 5-minute micro-lesson plan...`
    });
  }
  return actions;
};
```

**Smart, dynamic, reduces user typing**

#### Current Vidya (NONE)
```
❌ No quick actions
❌ User has to type everything manually
❌ No context-aware suggestions
```

---

## ✅ Proposed Redesign Architecture

### 1. Clean System Instruction (New Pattern)

```typescript
const VIDYA_BASE_INSTRUCTION = `You are Vidya (Sanskrit for "knowledge"), an AI teaching assistant for EduJourney - Universal Teacher Studio.

Current Role: ${role === 'teacher' ? 'EXPERT PEDAGOGICAL CONSULTANT & ANALYTICS SPECIALIST' : 'SUPPORTIVE STUDY COMPANION'}.

CONTEXT AWARENESS:
- You receive structured app data via [SYSTEM_CONTEXT_DATA] JSON blocks
- This includes: scanned papers, questions, topics, difficulty, user's current view
- ALWAYS reference this data when answering queries
- If user asks "Which is hardest?", analyze the questions in context data

FORMATTING:
- Math: Use LaTeX like $x^2$ or $$E=mc^2$$
- Chemistry: Use $\\ce{H2O}$ for formulas, $\\ce{2H2 + O2 -> 2H2O}$ for reactions
- Physics: Use $\\pu{5 m/s}$ for units
- Tables: Use markdown tables for comparisons
- Source attribution: Tag responses with [From: scan name] or [General concept]
`;

const TEACHER_MODE_RULES = `
TEACHER MODE RULES:
1. PROFESSIONALISM: Be analytical, concise, and data-driven
2. PEDAGOGY: Focus on learning objectives, common student misconceptions, teaching strategies
3. ANALYTICS: Deeply analyze difficulty patterns, topic distributions, provide remedial suggestions
4. CONTENT GENERATION: Create lesson plans, question variations, study materials when requested
`;

const STUDENT_MODE_RULES = `
STUDENT MODE RULES:
1. SUPPORTIVE COACHING: Be encouraging, use emojis (📊 📈 ✨ 🎯 💡), make learning fun
2. DETAILED EXPLANATIONS: Provide step-by-step reasoning, show WHY and HOW
3. SOURCE ATTRIBUTION: Always cite where information comes from ([From: KCET 2022] or [General concept])
4. EDUCATIONAL VALUE: Teach using their actual scanned questions as examples, not just external links
`;
```

**Total**: ~30 lines, clean and clear

---

### 2. Structured Context Injection (JSON)

```typescript
interface VidyaContextPayload {
  userRole: 'teacher' | 'student';
  currentView: string;
  scannedPapers: {
    total: number;
    recent: Array<{
      name: string;
      date: string;
      subject: string;
      questionCount: number;
    }>;
  };
  currentScan?: {
    name: string;
    questionCount: number;
    topicDistribution: Record<string, number>;
    difficultyBreakdown: Record<string, number>;
  };
  allQuestions: Array<{
    scanName: string;
    scanDate: string;
    questionNumber: number;
    topic: string;
    difficulty: string;
    marks: number;
    text: string;
    options?: string[];
    correctAnswer?: string;
  }>;
  // Smart summarization - don't send ALL data, send relevant subset
  topRecurringQuestions?: Array<{
    text: string;
    frequency: number;
    scans: string[];
  }>;
}

// Usage
const contextPayload: VidyaContextPayload = buildContextPayload(appContext);

const promptWithContext = `
[SYSTEM_CONTEXT_DATA]
${JSON.stringify(contextPayload, null, 2)}
[/SYSTEM_CONTEXT_DATA]

User Query: ${userMessage}
`;
```

**Benefits**:
- Clean JSON structure
- Easy for Gemini to parse
- Type-safe
- No verbose text descriptions
- Smart summarization (send relevant data, not everything)

---

### 3. Intent Classification Layer (Before Gemini)

```typescript
type Intent =
  | { type: 'info_request'; category: 'question_details' | 'scan_info' | 'concept_explanation' }
  | { type: 'analysis_request'; analysisType: 'difficulty' | 'topics' | 'temporal' | 'custom' }
  | { type: 'action_request'; tool: 'navigate' | 'generate_insights' | 'create_lesson' | 'export' }
  | { type: 'educational_query'; needsTeaching: boolean };

async function classifyIntent(userMessage: string, context: VidyaContextPayload): Promise<Intent> {
  // Use lightweight classification (regex + keywords, or lightweight model)

  // Info requests
  if (userMessage.match(/which.*hardest|what.*answer|show.*options/i)) {
    return { type: 'info_request', category: 'question_details' };
  }

  // Analysis requests
  if (userMessage.match(/analyze|cognitive drift|evolution|trajectory|trend/i)) {
    return { type: 'analysis_request', analysisType: 'custom' };
  }

  // Action requests
  if (userMessage.match(/open|navigate|go to|generate sketch|create lesson|export/i)) {
    return { type: 'action_request', tool: detectTool(userMessage) };
  }

  // Educational queries
  if (userMessage.match(/explain|teach|how to|what is|help me study/i)) {
    return { type: 'educational_query', needsTeaching: true };
  }

  // Default: info request
  return { type: 'info_request', category: 'concept_explanation' };
}

// Route based on intent
const intent = await classifyIntent(userMessage, contextPayload);

if (intent.type === 'action_request') {
  // Call tool directly, don't ask Gemini
  await executeToolAction(intent.tool, contextPayload);
} else {
  // Send to Gemini with structured context
  await sendToGemini(promptWithContext);
}
```

**Benefits**:
- Fast, lightweight classification
- Route actions directly to tools (no LLM needed)
- Reduce Gemini calls for simple operations
- Clear separation: Classification → Routing → Execution

---

### 4. Quick Actions (Context-Aware Buttons)

```typescript
function getVidyaQuickActions(
  role: 'teacher' | 'student',
  context: VidyaContextPayload
): Array<{ label: string; prompt: string }> {
  const actions: Array<{ label: string; prompt: string }> = [];

  if (role === 'teacher') {
    // Teacher quick actions
    if (context.currentScan) {
      actions.push({
        label: `Analyze ${context.currentScan.name}`,
        prompt: `Analyze the difficulty distribution and topic coverage in "${context.currentScan.name}". Identify weak areas students might struggle with.`
      });

      actions.push({
        label: 'Generate Study Plan',
        prompt: `Create a structured study plan prioritizing hardest topics in "${context.currentScan.name}".`
      });
    }

    if (context.scannedPapers.total > 1) {
      actions.push({
        label: 'Cross-Scan Analysis',
        prompt: `Compare question difficulty and topics across all ${context.scannedPapers.total} scanned papers. Identify trends.`
      });
    }

  } else {
    // Student quick actions
    if (context.currentScan) {
      actions.push({
        label: 'Which is hardest?',
        prompt: `Which question in "${context.currentScan.name}" is the most difficult and why?`
      });

      actions.push({
        label: 'Study Tips',
        prompt: `Give me study tips for the topics in "${context.currentScan.name}".`
      });
    }

    if (context.topRecurringQuestions && context.topRecurringQuestions.length > 0) {
      actions.push({
        label: 'Master Recurring Questions',
        prompt: `Teach me how to solve the most frequently appearing question across my scans.`
      });
    }
  }

  return actions;
}
```

---

### 5. Security & RBAC Layer

```typescript
interface SecurityPolicy {
  maxContextSize: number; // bytes
  allowedTools: string[];
  rateLimit: { maxRequests: number; windowMs: number };
  contentFilters: string[]; // block certain keywords
}

const TEACHER_POLICY: SecurityPolicy = {
  maxContextSize: 50000,
  allowedTools: ['navigate', 'generateInsights', 'createLesson', 'generateSketches', 'exportData'],
  rateLimit: { maxRequests: 100, windowMs: 60000 },
  contentFilters: []
};

const STUDENT_POLICY: SecurityPolicy = {
  maxContextSize: 30000,
  allowedTools: ['navigate'], // Limited tools for students
  rateLimit: { maxRequests: 50, windowMs: 60000 },
  contentFilters: ['hack', 'exploit', 'bypass'] // Basic content filtering
};

function validateRequest(
  userMessage: string,
  context: VidyaContextPayload,
  policy: SecurityPolicy
): { valid: boolean; reason?: string } {
  // Size check
  const contextSize = JSON.stringify(context).length;
  if (contextSize > policy.maxContextSize) {
    return { valid: false, reason: 'Context too large' };
  }

  // Content filter
  const lowerMsg = userMessage.toLowerCase();
  if (policy.contentFilters.some(filter => lowerMsg.includes(filter))) {
    return { valid: false, reason: 'Inappropriate content detected' };
  }

  // Rate limit check (implement with cache/store)
  // ...

  return { valid: true };
}
```

---

## 📁 New File Structure

```
/utils/
  vidya/
    systemInstructions.ts      // Base + role-specific prompts
    contextBuilder.ts           // Build structured JSON context
    intentClassifier.ts         // Classify user intent
    securityValidator.ts        // RBAC, rate limiting, validation
    quickActions.ts             // Context-aware quick action generator

/hooks/
  useVidyaChat.ts               // Main chat hook (refactored)

/components/
  vidya/
    VidyaV2.tsx                 // Main UI (keep existing)
    VidyaMessageBubble.tsx      // Message rendering (keep existing)
    VidyaQuickActions.tsx       // NEW: Quick action chips
    VidyaRoleSwitch.tsx         // NEW: Teacher/Student toggle
```

---

## 🎯 Implementation Plan

### Phase 1: Core Refactor (Day 1)
- [ ] Create `/utils/vidya/systemInstructions.ts` with clean 30-line prompts
- [ ] Create `/utils/vidya/contextBuilder.ts` for structured JSON context
- [ ] Update `useVidyaChat.ts` to use new system
- [ ] Test basic Q&A with new structure

### Phase 2: Intent Classification (Day 2)
- [ ] Create `/utils/vidya/intentClassifier.ts` with regex-based classification
- [ ] Route action requests directly to tools (bypass Gemini)
- [ ] Route info/educational requests to Gemini with context
- [ ] Test routing logic

### Phase 3: Quick Actions & RBAC (Day 3)
- [ ] Create `/utils/vidya/quickActions.ts` for context-aware buttons
- [ ] Create `/components/vidya/VidyaQuickActions.tsx` UI
- [ ] Create `/utils/vidya/securityValidator.ts` for RBAC
- [ ] Implement teacher/student role switching
- [ ] Test permissions and rate limiting

### Phase 4: Polish & Testing (Day 4)
- [ ] Add `/components/vidya/VidyaRoleSwitch.tsx` toggle
- [ ] Comprehensive testing with all query types
- [ ] Performance optimization (context size, caching)
- [ ] Documentation update

---

## ✅ Success Criteria

After redesign, Vidya should:

1. **Be AI-First**:
   - ✅ ~30-line system prompt (not 62+)
   - ✅ Trust Gemini to be intelligent
   - ✅ No over-specification

2. **Have Clean Context**:
   - ✅ Structured JSON context (not text dump)
   - ✅ Easy for AI to parse
   - ✅ Smart summarization (relevant data only)

3. **Route Intelligently**:
   - ✅ Intent classification layer
   - ✅ Direct tool routing for actions
   - ✅ Gemini only for info/educational queries

4. **Provide Quick Actions**:
   - ✅ Context-aware suggestion chips
   - ✅ Pre-written prompts for common tasks
   - ✅ Reduce user typing friction

5. **Enforce Security**:
   - ✅ RBAC for teacher/student
   - ✅ Rate limiting
   - ✅ Content filtering
   - ✅ Context size validation

6. **Feel Like AI**:
   - ✅ Not a hard-coded lookup system
   - ✅ Not a rigid rules engine
   - ✅ Intelligent, flexible, helpful
   - ✅ Like your original math chat!

---

## 🔄 Migration Strategy

### Option A: Big Bang (Risky)
- Replace entire Vidya implementation at once
- Downtime: ~1 day
- Risk: High (might break existing functionality)

### Option B: Parallel Development (Safe)
- Create VidyaV3 alongside VidyaV2
- Test thoroughly before switching
- Feature flag to toggle between versions
- Gradual rollout
- **RECOMMENDED**

### Option C: Incremental (Safest)
- Week 1: Refactor system instruction only
- Week 2: Add structured context
- Week 3: Add intent classification
- Week 4: Add quick actions + RBAC
- No downtime, gradual improvement

---

## 📊 Expected Improvements

| Metric | Current (VidyaV2) | After Redesign (VidyaV3) |
|--------|-------------------|--------------------------|
| System prompt lines | 62 | ~30 |
| Context format | Text dump | Structured JSON |
| Response consistency | 70% | 95%+ |
| User friction | High (manual typing) | Low (quick actions) |
| Tool routing accuracy | 75% | 95%+ |
| Feels like | Rules engine | AI assistant |
| Code maintainability | Low (band-aids) | High (clean architecture) |

---

## 💬 Questions for You

1. **Approve redesign?** Yes/No - should we proceed with VidyaV3?

2. **Migration strategy?**
   - Option A (Big Bang)
   - Option B (Parallel - VidyaV3 alongside V2) ✅ RECOMMENDED
   - Option C (Incremental)

3. **Priority features?**
   - All 5 phases at once?
   - Start with Phase 1-2 (core + intent)?

4. **Timeline?**
   - Full redesign (4 days)
   - MVP (2 days - Phase 1-2 only)

5. **Keep VidyaV2 as fallback?**
   - Yes (feature flag to switch)
   - No (full replacement)

---

## 🎓 Key Lesson

**What went wrong**: We treated every user complaint as a prompt engineering problem. We kept adding rules instead of trusting the AI.

**What your math chat teaches**: Keep it simple. Give the AI structured data and clear role. Let it be intelligent. Don't over-specify.

**Moving forward**: AI-first design. Clean architecture. Trust Gemini. Add guardrails where needed (RBAC, security), but let the AI do what it's good at - being intelligent.

---

**Status**: 🔴 **AWAITING YOUR APPROVAL**

Please review and let me know:
1. Should we proceed with redesign?
2. Which migration strategy?
3. What timeline works for you?

This is a major refactoring, but I believe it's the right direction to make Vidya a true "Next-Gen AI Assistant" instead of a hard-coded lookup system. 🚀
