# Vidya V2 - Industry-Best AI Assistant Architecture

## Executive Summary

Vidya V2 is a complete redesign of the AI assistant for EduJourney, transforming it from a simple chatbot into an **intelligent teaching companion** with proactive suggestions, function calling, deep app integration, and session memory.

---

## Core Principles

1. **Context-Aware**: Always knows the full app state and user context
2. **Action-Capable**: Can perform actions, not just give advice
3. **Proactive**: Suggests next steps and anticipates user needs
4. **Persistent**: Remembers conversations across sessions
5. **Insightful**: Analyzes data and generates actionable insights
6. **Conversational**: Natural, helpful, and adaptive to user style

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vidya V2 System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────┐  ┌────────────────────┐                │
│  │  Context Engine   │  │  Action Registry   │                │
│  │  - App State      │  │  - Tool Definitions│                │
│  │  - User Profile   │  │  - Function Calling│                │
│  │  - Session Memory │  │  - Validators      │                │
│  └───────────────────┘  └────────────────────┘                │
│                                                                 │
│  ┌───────────────────┐  ┌────────────────────┐                │
│  │  Suggestion AI    │  │  Analytics Engine  │                │
│  │  - Proactive Tips │  │  - Data Insights   │                │
│  │  - Quick Actions  │  │  - Trend Analysis  │                │
│  │  - Smart Prompts  │  │  - Predictions     │                │
│  └───────────────────┘  └────────────────────┘                │
│                                                                 │
│  ┌───────────────────────────────────────────┐                │
│  │         Gemini 2.0 Flash + Tools          │                │
│  │  - Function Calling                       │                │
│  │  - Structured Outputs                     │                │
│  │  - Vision Support                         │                │
│  └───────────────────────────────────────────┘                │
│                                                                 │
│  ┌───────────────────────────────────────────┐                │
│  │         Rich UI Components                │                │
│  │  - Message Cards                          │                │
│  │  - Action Buttons                         │                │
│  │  - Data Visualizations                    │                │
│  │  - Quick Reply Chips                      │                │
│  └───────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Function Calling / Tool Use

Vidya can perform actions in the app:

| Tool | Description | Example |
|------|-------------|---------|
| `navigateTo` | Navigate to different app sections | "Show me the exam analysis" |
| `scanPaper` | Trigger paper scanning workflow | "Scan a new paper" |
| `createLesson` | Open lesson creator with pre-filled data | "Create a trigonometry lesson" |
| `generateInsights` | Analyze data and show insights | "What's my best performing topic?" |
| `exportData` | Export reports/summaries | "Export this analysis as PDF" |
| `filterScans` | Filter scanned papers by criteria | "Show me all Math papers" |
| `searchQuestions` | Search through question bank | "Find questions on quadratic equations" |

### 2. Proactive Suggestions

Vidya suggests actions based on context:

- **Board Mastermind**: "I see you haven't scanned papers in 3 days. Want to scan a new one?"
- **After Scanning**: "Great! This paper has 45 questions. Should I generate high-yield sketches?"
- **Low Mastery**: "Your mastery score is 45%. Let me create a practice quiz on weak topics."
- **Pattern Detection**: "I notice you scan a lot of Math papers. Want to create a Math question bank?"

### 3. Rich Message Types

Beyond text, Vidya sends:

- **Insight Cards**: Data visualizations with key metrics
- **Action Buttons**: "Scan Paper", "Create Lesson", "View Analysis"
- **Quick Replies**: Pre-defined response chips for common actions
- **Progress Indicators**: Live progress bars for long operations
- **Image Messages**: Diagrams, sketches, charts

### 4. Session Memory

- Conversations persist across page refreshes (localStorage)
- User preferences remembered (tone, detail level)
- Context continuity: "As we discussed earlier..."
- Conversation export and search

### 5. Analytics & Insights

Vidya can analyze your data:

- "Your top 3 topics by scan frequency: Algebra (15), Trigonometry (12), Calculus (8)"
- "Students struggle most with Mechanics (avg 52% mastery)"
- "Predicted next exam topics: Thermodynamics (85% probability)"
- "Your lesson creation rate increased 40% this month"

### 6. Multi-Modal Input

- Text input (default)
- Image upload: "What's in this diagram?" (future)
- Voice input: Speech-to-text (future)

---

## Technical Implementation

### Type System

```typescript
// Enhanced message types
export type VidyaMessageType =
  | 'text'           // Plain text
  | 'insight_card'   // Data visualization card
  | 'action_prompt'  // Message with action buttons
  | 'quick_reply'    // Suggested response chips
  | 'progress'       // Progress indicator
  | 'image';         // Image message

export interface VidyaMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  type: VidyaMessageType;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;

  // Rich content
  metadata?: {
    actions?: VidyaAction[];      // Buttons to perform actions
    quickReplies?: string[];      // Suggested user responses
    insightData?: any;            // Data for visualization
    imageUrl?: string;            // Image URL
    progress?: number;            // 0-100 for progress bars
  };

  // Tool execution results
  toolCalls?: VidyaToolCall[];
  toolResults?: VidyaToolResult[];
}

// Tool/Function calling
export interface VidyaTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  handler: (params: any, context: VidyaAppContext) => Promise<any>;
}

export interface VidyaToolCall {
  id: string;
  toolName: string;
  parameters: any;
}

export interface VidyaToolResult {
  toolCallId: string;
  success: boolean;
  result: any;
  error?: string;
}

// Actions (UI buttons)
export interface VidyaAction {
  id: string;
  label: string;
  icon?: string;
  variant: 'primary' | 'secondary' | 'ghost';
  action: () => void;
}

// Session memory
export interface VidyaSession {
  id: string;
  startedAt: Date;
  lastActiveAt: Date;
  messages: VidyaMessage[];
  userRole: UserRole;
  preferences: {
    tone: 'professional' | 'friendly' | 'concise';
    detailLevel: 'brief' | 'detailed';
    proactiveSuggestions: boolean;
  };
}

// Proactive suggestions
export interface VidyaSuggestion {
  id: string;
  trigger: string;          // What triggered this suggestion
  message: string;          // Suggestion text
  actions?: VidyaAction[];  // Suggested actions
  priority: 'low' | 'medium' | 'high';
}
```

### Context Engine

```typescript
class VidyaContextEngine {
  private appContext: VidyaAppContext;
  private userProfile: UserProfile;
  private sessionHistory: VidyaMessage[];

  // Generate comprehensive context for each message
  generateContext(): string {
    return `
# Current App State
${this.formatAppState()}

# User Profile
- Role: ${this.userProfile.role}
- Active View: ${this.appContext.currentView}
- Session Duration: ${this.getSessionDuration()}

# Recent Activity
${this.formatRecentActivity()}

# Available Actions
${this.listAvailableTools()}
    `;
  }

  // Detect patterns for proactive suggestions
  detectPatterns(): VidyaSuggestion[] {
    const suggestions: VidyaSuggestion[] = [];

    // Example: No scans in 3 days
    if (this.daysSinceLastScan() > 3) {
      suggestions.push({
        id: 'scan-reminder',
        trigger: 'inactivity',
        message: "Haven't scanned any papers recently. Want to scan a new one?",
        actions: [{ label: 'Scan Paper', action: () => navigateTo('mastermind') }],
        priority: 'medium'
      });
    }

    return suggestions;
  }
}
```

### Tool Registry

```typescript
const VIDYA_TOOLS: VidyaTool[] = [
  {
    name: 'navigateTo',
    description: 'Navigate to a different section of the app',
    parameters: {
      type: 'object',
      properties: {
        view: {
          type: 'string',
          enum: ['mastermind', 'analysis', 'sketches', 'lessons', 'vault'],
          description: 'The app section to navigate to'
        }
      },
      required: ['view']
    },
    handler: async (params, context) => {
      context.actions.navigateTo(params.view);
      return { success: true, message: `Navigated to ${params.view}` };
    }
  },

  {
    name: 'generateInsights',
    description: 'Analyze scanned papers and generate insights',
    parameters: {
      type: 'object',
      properties: {
        analysisType: {
          type: 'string',
          enum: ['topic_distribution', 'difficulty_trends', 'predictions'],
          description: 'Type of analysis to perform'
        }
      },
      required: ['analysisType']
    },
    handler: async (params, context) => {
      const insights = await analyzeData(context.scannedPapers, params.analysisType);
      return { success: true, insights };
    }
  },

  {
    name: 'filterScans',
    description: 'Filter scanned papers by criteria',
    parameters: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Subject to filter by' },
        grade: { type: 'string', description: 'Grade to filter by' },
        dateRange: { type: 'string', description: 'Date range (last_week, last_month, etc.)' }
      },
      required: []
    },
    handler: async (params, context) => {
      const filtered = filterScans(context.scannedPapers, params);
      return { success: true, count: filtered.length, scans: filtered };
    }
  }
];
```

### Gemini Integration with Function Calling

```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  tools: [{
    functionDeclarations: VIDYA_TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }))
  }],
  systemInstruction: contextEngine.generateContext()
});

// Handle function calls
const result = await chat.sendMessage(userMessage);
const response = result.response;

if (response.functionCalls()) {
  for (const call of response.functionCalls()) {
    const tool = VIDYA_TOOLS.find(t => t.name === call.name);
    const result = await tool.handler(call.args, appContext);

    // Send result back to model
    await chat.sendMessage([{
      functionResponse: {
        name: call.name,
        response: result
      }
    }]);
  }
}
```

---

## UI Components

### 1. Enhanced Message Bubble

```typescript
<VidyaMessage message={msg}>
  {msg.type === 'text' && <TextContent />}
  {msg.type === 'insight_card' && <InsightCard data={msg.metadata.insightData} />}
  {msg.type === 'action_prompt' && (
    <>
      <TextContent />
      <ActionButtons actions={msg.metadata.actions} />
    </>
  )}
  {msg.type === 'quick_reply' && <QuickReplyChips replies={msg.metadata.quickReplies} />}
</VidyaMessage>
```

### 2. Proactive Suggestion Bar

```typescript
<SuggestionBar>
  {suggestions.map(s => (
    <SuggestionChip
      key={s.id}
      priority={s.priority}
      onClick={() => handleSuggestion(s)}
    >
      {s.message}
    </SuggestionChip>
  ))}
</SuggestionBar>
```

### 3. Context Header

```typescript
<VidyaHeader>
  <Avatar animated />
  <ContextIndicator>
    <ViewBadge>📊 Viewing: Board Mastermind</ViewBadge>
    <DataBadge>51 scans • 1,247 questions</DataBadge>
  </ContextIndicator>
  <Actions>
    <ExportButton />
    <ClearHistoryButton />
    <CloseButton />
  </Actions>
</VidyaHeader>
```

---

## User Experience Flow

### Teacher Flow: Scanning Paper

1. **User opens Board Mastermind**
   - Vidya (proactive): "👋 Ready to scan a new paper? I'll analyze it for difficulty, topics, and create high-yield sketches."

2. **User scans paper**
   - Vidya (during scan): *Progress bar* "Scanning... Extracting 45 questions..."
   - Vidya (after scan): *Insight Card*
     ```
     📊 Scan Complete: KCET Math 2022

     ✓ 45 questions analyzed
     ✓ Difficulty: 60% Hard, 30% Medium, 10% Easy
     ✓ Top topics: Calculus (40%), Algebra (35%)

     [View Analysis] [Generate Sketches] [Create Lesson]
     ```

3. **User clicks "Generate Sketches"**
   - Vidya: *Tool Call* → `generateSketches({ scanId: '...' })`
   - Vidya: "🎨 Creating 12 high-yield sketches... Done! [View Gallery]"

4. **User asks: "What topics should I focus on?"**
   - Vidya: *Tool Call* → `generateInsights({ type: 'topic_priority' })`
   - Vidya: *Insight Card*
     ```
     📈 Priority Topics (Based on 51 scans)

     1. Calculus - 18 papers (35%), High difficulty
     2. Trigonometry - 15 papers (29%), Medium difficulty
     3. Algebra - 12 papers (24%), Mixed difficulty

     💡 Recommendation: Create targeted lessons for Calculus
     since it appears frequently and has high difficulty.

     [Create Calculus Lesson] [View All Topics]
     ```

### Student Flow: Learning Session

1. **User starts lesson**
   - Vidya: "🚀 Starting 'Trigonometry Basics'. You're currently at 45% mastery. Let's improve that!"

2. **User struggles with quiz**
   - Vidya (detects pattern): "I notice you're having trouble with sin/cos transformations. Want a quick refresher?"
   - [Yes] [Skip]

3. **User completes module**
   - Vidya: "✨ Great work! Mastery: 45% → 62% (+17%). Next up: Practical applications."

---

## Session Persistence

### localStorage Schema

```typescript
interface StoredSession {
  sessionId: string;
  version: 2;
  userRole: UserRole;
  startedAt: string;
  lastActiveAt: string;
  messages: SerializedMessage[];
  preferences: UserPreferences;
  metadata: {
    totalMessages: number;
    actionsTaken: number;
    insightsGenerated: number;
  };
}

// Save after each message
localStorage.setItem('vidya_session', JSON.stringify(session));

// Load on init
const session = JSON.parse(localStorage.getItem('vidya_session'));
```

---

## Analytics & Metrics

Vidya tracks:

- **Usage**: Messages sent, actions taken, tools used
- **Effectiveness**: User satisfaction (thumbs up/down), task completion rate
- **Patterns**: Most common questions, peak usage times, popular tools
- **Performance**: Response time, error rate, tool success rate

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Priority)
- ✅ Enhanced type system
- ✅ Context engine with real-time state
- ✅ Tool registry and function calling
- ✅ Session persistence (localStorage)

### Phase 2: Rich UI (Priority)
- ✅ Enhanced message components (cards, buttons, chips)
- ✅ Proactive suggestion system
- ✅ Context-aware header
- ✅ Quick action menu

### Phase 3: Intelligence (High Priority)
- ✅ Analytics engine for insights
- ✅ Pattern detection for proactive suggestions
- ✅ Smart data visualization

### Phase 4: Advanced Features (Medium Priority)
- ⏳ Conversation export/import
- ⏳ Message reactions and feedback
- ⏳ Advanced search through history
- ⏳ Voice input support

### Phase 5: Polish & Optimization
- ⏳ Performance optimization
- ⏳ Accessibility improvements
- ⏳ Mobile-optimized UI
- ⏳ Extensive testing

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Daily Active Users | 80% of teachers | TBD |
| Actions Performed via Vidya | 40% of all actions | TBD |
| User Satisfaction | >4.5/5 | TBD |
| Tool Success Rate | >95% | TBD |
| Avg Response Time | <2s | TBD |
| Session Persistence | 100% | TBD |

---

## Technical Requirements

- **Gemini 2.0 Flash** with function calling support
- **localStorage** for session persistence (5MB limit)
- **React 18+** for concurrent features
- **TypeScript 5+** for type safety
- **Tailwind CSS** for styling

---

## Security & Privacy

- No sensitive data sent to Gemini (only anonymized context)
- User data stays in localStorage (not transmitted to servers)
- Tool execution requires explicit user consent for destructive actions
- Rate limiting to prevent abuse

---

This architecture transforms Vidya from a simple chatbot into an **intelligent teaching companion** that truly understands and enhances the EduJourney experience.
