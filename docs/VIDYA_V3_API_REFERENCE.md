# VidyaV3 - Complete API Reference

**Date**: 2026-01-29
**Version**: 3.0.0
**Status**: Production Ready

---

## Table of Contents

1. [Core Components](#core-components)
2. [Hooks](#hooks)
3. [Utility Functions](#utility-functions)
4. [Type Definitions](#type-definitions)
5. [Configuration](#configuration)
6. [Usage Examples](#usage-examples)

---

## Core Components

### VidyaV3

**File**: `/components/VidyaV3.tsx`

Main chatbot UI component with floating action button and chat window.

**Props**:
```typescript
interface VidyaV3Props {
  appContext?: VidyaAppContext;
}

interface VidyaAppContext {
  scannedPapers?: ScannedPaper[];
  selectedScan?: ScannedPaper;
  currentView?: string; // 'mastermind' | 'analysis' | 'vault' | etc.
}
```

**Usage**:
```typescript
import VidyaV3 from './components/VidyaV3';

// In God Mode (Teacher)
<VidyaV3
  appContext={{
    scannedPapers: recentScans,
    selectedScan: selectedScan,
    currentView: 'mastermind',
  }}
/>

// In Student Mode
<VidyaV3
  appContext={{
    currentView: 'module',
  }}
/>
```

**Features**:
- Floating action button (FAB) in bottom-right corner
- Glassmorphism chat window with smooth animations
- Role switcher (Teacher/Student)
- Message history with streaming responses
- Quick action suggestions
- Math/Science formula rendering
- Auto-scroll behavior
- Clear chat functionality

**Key Methods** (Internal):
- `toggleChat()` - Opens/closes chat window
- `handleSend(text)` - Sends message to AI
- `handleKeyDown(e)` - Handles Enter/Shift+Enter in textarea

---

### VidyaQuickActions

**File**: `/components/vidya/VidyaQuickActions.tsx`

Context-aware quick action suggestion chips.

**Props**:
```typescript
interface VidyaQuickActionsProps {
  actions: QuickAction[];
  onActionClick: (prompt: string) => void;
  disabled?: boolean;
  userRole: 'teacher' | 'student';
}

interface QuickAction {
  id: string;
  label: string; // Display text
  prompt: string; // Full prompt to send
  icon?: string; // Lucide icon name
}
```

**Usage**:
```typescript
import VidyaQuickActions from './vidya/VidyaQuickActions';

<VidyaQuickActions
  actions={quickActions}
  onActionClick={(prompt) => sendMessage(prompt)}
  disabled={isTyping}
  userRole="student"
/>
```

**Features**:
- Horizontal scrollable chips
- Role-specific styling
- Icon support (Lucide icons)
- Hover effects and tooltips
- Disabled state during AI responses

---

## Hooks

### useVidyaChatV3

**File**: `/hooks/useVidyaChatV3.ts`

Main chat hook managing state, Gemini API, and message flow.

**Signature**:
```typescript
export function useVidyaChatV3(
  appContext?: VidyaAppContext
): UseVidyaChatV3Return
```

**Return Type**:
```typescript
export interface UseVidyaChatV3Return {
  messages: VidyaMessage[];
  isOpen: boolean;
  isTyping: boolean;
  error: string | null;
  userRole: VidyaRole;
  setUserRole: (role: VidyaRole) => void;
  toggleChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}
```

**Usage**:
```typescript
import { useVidyaChatV3 } from '../hooks/useVidyaChatV3';

const {
  messages,
  isOpen,
  isTyping,
  error,
  userRole,
  setUserRole,
  toggleChat,
  sendMessage,
  clearChat,
} = useVidyaChatV3(appContext);

// Send a message
await sendMessage("Explain photosynthesis");

// Switch roles
setUserRole('teacher');

// Clear history
clearChat();
```

**Internal Flow**:
1. Initialize Gemini chat session with role-based system instruction
2. On message send:
   - Build context payload from app state
   - Classify intent (info/analysis/action/educational)
   - Validate security (RBAC filtering)
   - Send to Gemini with filtered context
   - Stream response and update UI
3. Handle role changes by reinitializing chat session

**Configuration**:
```typescript
model: 'gemini-2.0-flash-exp'
generationConfig: {
  temperature: 0.7,
  maxOutputTokens: 800,
  topP: 0.95,
  topK: 40,
}
```

---

## Utility Functions

### System Instructions

**File**: `/utils/vidya/systemInstructions.ts`

**Functions**:

#### `getSystemInstruction(role: VidyaRole): string`
Returns complete system instruction for Gemini based on user role.

```typescript
const instruction = getSystemInstruction('student');
// Returns: ~30-line prompt with student-specific guidelines
```

#### `getWelcomeMessage(role: VidyaRole): string`
Returns initial welcome message when chat opens.

```typescript
const welcome = getWelcomeMessage('teacher');
// Returns: "Ready for new instructions."
```

#### `getRoleTransitionMessage(role: VidyaRole): string`
Returns message shown when user switches roles.

```typescript
const transition = getRoleTransitionMessage('teacher');
// Returns: "Switched to Teacher mode. I'm now your pedagogical consultant..."
```

---

### Context Builder

**File**: `/utils/vidya/contextBuilder.ts`

**Functions**:

#### `buildContextPayload(appState: AppState, userRole: VidyaRole): VidyaContextPayload`
Builds structured JSON context payload from app state.

```typescript
const contextPayload = buildContextPayload({
  currentView: 'mastermind',
  scannedPapers: scans,
  selectedScan: selectedScan,
}, 'student');

// Returns structured payload with:
// - userRole
// - currentView
// - scannedPapers summary
// - currentScan details (topics, difficulty, questions)
// - questions array (with extracted exam years)
// - topRecurringQuestions (if available)
```

**Payload Structure**:
```typescript
export interface VidyaContextPayload {
  userRole: VidyaRole;
  currentView: string;
  scannedPapers: {
    total: number;
    recent: Array<{
      name: string;
      date: string;
      subject: string;
      grade: string;
      questionCount: number;
      timestamp: number;
    }>;
  };
  currentScan?: {
    name: string;
    date: string;
    subject: string;
    grade: string;
    questionCount: number;
    topicDistribution: Record<string, number>;
    difficultyBreakdown: Record<string, number>;
  };
  questions: Array<{
    scanName: string;
    scanDate: string;
    examYear?: number; // Extracted from scan name
    questionNumber: number;
    topic: string;
    difficulty: string;
    marks: number;
    text: string;
    options?: string[];
    correctAnswer?: string; // Filtered for students
  }>;
  topRecurringQuestions?: Array<{
    text: string;
    frequency: number;
    scans: string[];
  }>;
}
```

#### `formatContextForGemini(payload: VidyaContextPayload, userMessage: string): string`
Formats context payload with JSON delimiters for Gemini.

```typescript
const prompt = formatContextForGemini(contextPayload, "Which is hardest?");

// Returns:
// [SYSTEM_CONTEXT_DATA]
// {
//   "userRole": "student",
//   "currentView": "mastermind",
//   ...
// }
// [/SYSTEM_CONTEXT_DATA]
//
// User Query: Which is hardest?
```

---

### Intent Classifier

**File**: `/utils/vidya/intentClassifier.ts`

**Types**:
```typescript
export type IntentType =
  | 'info_request'      // "Which is hardest?" "Show me options"
  | 'analysis_request'  // "Analyze difficulty" "Show trends"
  | 'action_request'    // "Open Board Mastermind" "Generate sketches"
  | 'educational_query' // "Explain this concept" "Help me study"
  | 'unclear';          // Fallback

export interface Intent {
  type: IntentType;
  confidence: number; // 0-1
  suggestedTool?: string;
  category?: string;
}

export interface RoutingDecision {
  route: 'gemini' | 'tool' | 'hybrid';
  intent: Intent;
  toolName?: string;
  toolParams?: Record<string, any>;
  requiresContext: boolean;
}
```

**Functions**:

#### `classifyIntent(userMessage: string, context?: VidyaContextPayload): Intent`
Classifies user query intent using regex patterns.

```typescript
const intent = classifyIntent("Analyze difficulty distribution");
// Returns: { type: 'analysis_request', confidence: 0.85, category: 'general_analysis' }
```

#### `getRoutingDecision(userMessage: string, context?: VidyaContextPayload): RoutingDecision`
Determines routing strategy for query.

```typescript
const routing = getRoutingDecision("Explain this concept", contextPayload);
// Returns: { route: 'gemini', intent: {...}, requiresContext: true }
```

**Intent Patterns**:

| Pattern | Intent Type | Example Queries |
|---------|-------------|-----------------|
| `which|what.*hardest|difficult` | info_request | "Which is hardest?" |
| `analyze|examine` | analysis_request | "Analyze this paper" |
| `open|navigate to` | action_request | "Open Board Mastermind" |
| `explain|teach|help me` | educational_query | "Explain photosynthesis" |

---

### Quick Actions

**File**: `/utils/vidya/quickActions.ts`

**Functions**:

#### `getQuickActions(role: VidyaRole, context: VidyaContextPayload): QuickAction[]`
Generates context-aware quick actions based on role and available data.

```typescript
const actions = getQuickActions('student', contextPayload);
// Returns: [
//   { id: 'hardest-question', label: 'Which is Hardest?', prompt: '...', icon: 'Zap' },
//   { id: 'study-tips', label: 'Study Tips', prompt: '...', icon: 'BookOpen' },
//   ...
// ]
```

**Context-Aware Logic**:
- If `currentScan` present → Scan-specific actions
- If multiple scans → Cross-scan analysis action
- If recurring questions → Pattern mastery action
- If no data → Default onboarding actions

#### `getDefaultQuickActions(role: VidyaRole): QuickAction[]`
Returns fallback actions when no context available.

```typescript
const defaultActions = getDefaultQuickActions('student');
// Returns: [
//   { id: 'getting-started', label: 'Getting Started', prompt: '...', icon: 'HelpCircle' },
//   { id: 'study-tips-general', label: 'General Study Tips', prompt: '...', icon: 'BookOpen' }
// ]
```

---

### RBAC Security

**File**: `/utils/vidya/rbacValidator.ts`

**Types**:
```typescript
export enum PermissionLevel {
  FULL_ACCESS = 'full',
  EDUCATIONAL = 'educational',
  RESTRICTED = 'restricted',
}

export type DataCategory =
  | 'analytics'
  | 'answer_keys'
  | 'question_content'
  | 'study_guidance'
  | 'pedagogical_insights'
  | 'cross_scan_data'
  | 'administrative'
  | 'temporal_analysis';

export interface ValidationResult {
  allowed: boolean;
  level: PermissionLevel;
  reason?: string;
  filteredData?: any;
}
```

**Functions**:

#### `validateDataAccess(role: VidyaRole, category: DataCategory): ValidationResult`
Checks if role has permission for data category.

```typescript
const result = validateDataAccess('student', 'answer_keys');
// Returns: { allowed: false, level: 'restricted', reason: '...' }
```

#### `validateAction(role: VidyaRole, action: ActionCategory): ValidationResult`
Validates if role can perform specific action.

```typescript
const result = validateAction('student', 'pedagogical_planning');
// Returns: { allowed: false, level: 'restricted', reason: '...' }
```

#### `filterContextByRole(context: VidyaContextPayload, role: VidyaRole): VidyaContextPayload`
Filters context payload based on role permissions.

```typescript
const filteredContext = filterContextByRole(contextPayload, 'student');
// Returns context with correctAnswer fields removed for students
```

**Key Security Features**:
- Students: `correctAnswer` removed from all questions
- Students: Limited analytics (educational only)
- Teachers: Full access to all data
- Suspicious query detection and logging

#### `validateChatSecurity(role, intent, context, userQuery): SecurityValidation`
Main security validation function called before sending to Gemini.

```typescript
const validation = validateChatSecurity('student', 'info_request', contextPayload, "What are the answers?");
// Returns: {
//   validated: false,
//   filteredContext: {...}, // With answers removed
//   warnings: ['Detected answer-seeking query from student']
// }
```

#### `auditSecurityEvent(event, details): void`
Logs security events for monitoring.

```typescript
auditSecurityEvent('ACCESS_DENIED', {
  role: 'student',
  category: 'answer_keys',
  query: "Show me answers",
  timestamp: new Date(),
});
// Logs: [RBAC Audit] { event: 'ACCESS_DENIED', ... }
```

---

### Feature Flags

**File**: `/utils/featureFlags.ts`

**Functions**:

#### `getFeatureFlags(): FeatureFlags`
Retrieves feature flags from localStorage.

```typescript
const flags = getFeatureFlags();
// Returns: { useVidyaV3: true }
```

#### `isFeatureEnabled(flagName: string): boolean`
Checks if specific feature is enabled.

```typescript
if (isFeatureEnabled('useVidyaV3')) {
  return <VidyaV3 />;
} else {
  return <VidyaV2 />;
}
```

#### `setFeatureFlag(flagName, value): void`
Updates feature flag.

```typescript
setFeatureFlag('useVidyaV3', false); // Switch to V2
```

---

## Type Definitions

### VidyaMessage

```typescript
export interface VidyaMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}
```

### VidyaRole

```typescript
export type VidyaRole = 'teacher' | 'student';
```

### VidyaChatState

```typescript
export interface VidyaChatV3State {
  messages: VidyaMessage[];
  isOpen: boolean;
  isTyping: boolean;
  error: string | null;
}
```

---

## Configuration

### Environment Variables

```bash
# .env.local
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### Gemini Model Configuration

```typescript
model: 'gemini-2.0-flash-exp'

generationConfig: {
  temperature: 0.7,      // Creativity (0-1)
  maxOutputTokens: 800,  // Max response length
  topP: 0.95,           // Nucleus sampling
  topK: 40,             // Token selection diversity
}
```

### System Instruction Templates

**Student Mode** (~30 lines):
- Supportive coaching tone
- Detailed explanations
- Source attribution required
- Encouraging with emojis

**Teacher Mode** (~30 lines):
- Professional, analytical tone
- Data-driven insights
- Pedagogical focus
- Content generation capabilities

---

## Usage Examples

### Example 1: Basic Integration

```typescript
import VidyaV3 from './components/VidyaV3';

function App() {
  return (
    <div className="app">
      {/* Your app content */}

      {/* Vidya chatbot overlay */}
      <VidyaV3
        appContext={{
          currentView: 'dashboard',
        }}
      />
    </div>
  );
}
```

### Example 2: With Full App Context

```typescript
const appContext = {
  scannedPapers: [
    {
      id: '1',
      name: 'KCET 2022',
      subject: 'Physics',
      grade: '12',
      questionCount: 50,
      date: '2024-01-15',
      questions: [...],
    }
  ],
  selectedScan: selectedScan,
  currentView: 'mastermind',
};

<VidyaV3 appContext={appContext} />
```

### Example 3: Custom Quick Actions

```typescript
import { getQuickActions } from '../utils/vidya/quickActions';
import { buildContextPayload } from '../utils/vidya/contextBuilder';

// Build context
const contextPayload = buildContextPayload(appState, 'teacher');

// Get quick actions
const actions = getQuickActions('teacher', contextPayload);

// Render custom UI
{actions.map(action => (
  <button onClick={() => handleAction(action.prompt)}>
    {action.label}
  </button>
))}
```

### Example 4: Manual Security Validation

```typescript
import { validateChatSecurity } from '../utils/vidya/rbacValidator';

const userQuery = "What are the answers?";
const validation = validateChatSecurity('student', 'info_request', contextPayload, userQuery);

if (!validation.validated) {
  console.warn('Security warnings:', validation.warnings);
}

// Use filtered context
const safeContext = validation.filteredContext;
```

### Example 5: Intent Classification

```typescript
import { classifyIntent, getRoutingDecision } from '../utils/vidya/intentClassifier';

const userQuery = "Analyze difficulty distribution";

// Classify intent
const intent = classifyIntent(userQuery);
console.log('Intent:', intent.type, 'Confidence:', intent.confidence);

// Get routing decision
const routing = getRoutingDecision(userQuery, contextPayload);
if (routing.route === 'tool') {
  // Execute tool directly
  executeTool(routing.toolName, routing.toolParams);
} else {
  // Send to Gemini
  sendToGemini(userQuery);
}
```

### Example 6: Performance Monitoring

```typescript
// Track message performance
const startTime = Date.now();

await sendMessage(userQuery);

const endTime = Date.now();
console.log('[Performance] Response time:', endTime - startTime, 'ms');
```

---

## Error Handling

### Common Errors

**1. Missing API Key**
```typescript
Error: "Gemini API key not found. Please check environment variables."
```
**Solution**: Add `VITE_GEMINI_API_KEY` to `.env.local`

**2. Network Error**
```typescript
Error: "I encountered a network issue. Please try again."
```
**Solution**: Check internet connection, Gemini API status

**3. Context Too Large**
```typescript
Warning: "Context payload exceeds recommended size"
```
**Solution**: Implement context compression (see Performance Guide)

**4. Security Validation Failed**
```typescript
Warning: ['Detected answer-seeking query from student']
```
**Solution**: Expected behavior - query is still processed with guidance

---

## Best Practices

### 1. Always Provide Context
```typescript
// ✅ Good
<VidyaV3 appContext={{ currentView: 'mastermind', scannedPapers: scans }} />

// ❌ Bad
<VidyaV3 /> // No context = generic responses
```

### 2. Handle Role Switching Properly
```typescript
// ✅ Good - Let hook manage state
const { userRole, setUserRole } = useVidyaChatV3();

// ❌ Bad - Don't manage role externally
const [role, setRole] = useState('student'); // Conflicts with hook
```

### 3. Validate Security for Sensitive Operations
```typescript
// ✅ Good - Always validate before exposing data
const validation = validateChatSecurity(role, intent, context, query);
const safeContext = validation.filteredContext;

// ❌ Bad - Direct context exposure
sendToGemini(rawContext); // May leak answers to students
```

### 4. Use Quick Actions for Common Queries
```typescript
// ✅ Good - Leverage quick actions
const actions = getQuickActions(role, context);

// ❌ Bad - Expecting users to type everything
// No quick action suggestions = more typing friction
```

### 5. Monitor Performance
```typescript
// ✅ Good - Track metrics
console.log('[VidyaV3] Response time:', responseTime, 'ms');

// ❌ Bad - No visibility into performance
// Silent degradation without monitoring
```

---

## Migration from VidyaV2

### Key Differences

| Feature | VidyaV2 | VidyaV3 |
|---------|---------|---------|
| System Prompt | 189 lines | 30 lines |
| Context Injection | Text description | Structured JSON |
| Intent Classification | None | Regex-based |
| Security | Basic | RBAC with validation |
| Quick Actions | None | Context-aware |
| Role Switching | Via props | Built-in toggle |

### Migration Steps

1. **Replace Component**:
   ```typescript
   // Old
   import VidyaV2 from './components/VidyaV2';
   <VidyaV2 {...props} />

   // New
   import VidyaV3 from './components/VidyaV3';
   <VidyaV3 appContext={appContext} />
   ```

2. **Update App Context Structure**:
   ```typescript
   // Old - Multiple props
   <VidyaV2
     currentView="mastermind"
     scannedPapers={scans}
     selectedScan={scan}
     userRole="student"
   />

   // New - Single context object
   <VidyaV3
     appContext={{
       currentView: 'mastermind',
       scannedPapers: scans,
       selectedScan: scan,
     }}
   />
   ```

3. **Enable Feature Flag**:
   ```typescript
   localStorage.setItem('edujourney_feature_flags', JSON.stringify({ useVidyaV3: true }));
   ```

4. **Test Thoroughly** (see Testing Guide)

---

## Troubleshooting

### Chat Window Not Opening
- Check console for errors
- Verify Gemini API key is set
- Check z-index conflicts with other overlays

### Streaming Not Working
- Verify using `gemini-2.0-flash-exp` model
- Check network tab for streaming responses
- Ensure `sendMessageStream` is used (not `sendMessage`)

### Quick Actions Not Showing
- Verify `appContext` is passed with data
- Check console for context build errors
- Ensure `useMemo` dependencies include appContext

### Answers Visible to Students
- Check RBAC filtering is active
- Verify `filterContextByRole` is called
- Check security warnings in console

---

## API Versioning

**Current Version**: 3.0.0

**Semantic Versioning**:
- Major (3.x.x): Breaking API changes
- Minor (x.0.x): New features, backward-compatible
- Patch (x.x.0): Bug fixes

**Changelog**: See `/docs/VIDYA_V3_CHANGELOG.md`

---

## Support & Resources

- **Documentation**: `/docs/VIDYA_V3_*.md`
- **Testing Guide**: `/docs/VIDYA_V3_TESTING_GUIDE.md`
- **Performance**: `/docs/VIDYA_V3_PERFORMANCE_OPTIMIZATION.md`
- **Issues**: Report bugs in project issue tracker
- **Questions**: Contact development team

---

## License

Proprietary - EduJourney Universal Teacher Studio

---

## Contributors

- **Architecture**: Clean AI-First design pattern
- **Implementation**: VidyaV3 development team
- **Testing**: QA team
- **Documentation**: Technical writing team

**Last Updated**: 2026-01-29
