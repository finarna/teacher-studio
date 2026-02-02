# VidyaV3 - Comprehensive Testing Guide

**Date**: 2026-01-29
**Purpose**: Systematic testing of all VidyaV3 features, intents, and security

---

## Test Environment Setup

### Prerequisites
1. Application running with VidyaV3 enabled (feature flag = true)
2. Sample scanned papers loaded (at least 2-3 papers)
3. Browser console open to monitor logs
4. Both God Mode (Teacher) and Student Mode accessible

### Test Data Requirements
- **Minimum**: 2 scanned papers with different exam years (e.g., "KCET 2022", "NEET 2023")
- **Questions**: At least 10 questions across papers
- **Topics**: Multiple topics (Physics, Chemistry, Math, Biology)
- **Difficulty**: Mix of Easy, Medium, Hard
- **Recurring questions**: At least 2 questions that appear in multiple scans (optional but ideal)

---

## Phase 1: Core Functionality Tests

### Test 1.1: Chat Window Basics

**Test Steps**:
1. Open app in God Mode (Teacher)
2. Click Vidya FAB button in bottom-right corner
3. Verify chat window opens with animation
4. Check welcome message appears
5. Click X or FAB again to close
6. Verify chat closes smoothly

**Expected Results**:
- ✅ Smooth scale-in animation
- ✅ Welcome message: "Ready for new instructions."
- ✅ Glassmorphism effect visible
- ✅ Gradient header (slate-900 for teacher)
- ✅ No console errors

### Test 1.2: Role Switching

**Test Steps**:
1. Open chat window
2. Current role should be "Student" by default
3. Click "Teacher" toggle button
4. Wait for role transition message
5. Click "Student" toggle
6. Verify smooth transition

**Expected Results**:
- ✅ Role indicator updates immediately
- ✅ Header gradient changes (indigo for student, slate for teacher)
- ✅ Transition message appears: "Switched to [role] mode"
- ✅ Quick actions update to role-specific suggestions
- ✅ Console shows: `[VidyaV3] Role switched to: teacher/student`

### Test 1.3: Message Sending & Streaming

**Test Steps**:
1. In Student mode, type: "How can you help me?"
2. Press Enter (or click Send button)
3. Watch for streaming response

**Expected Results**:
- ✅ User message appears on right side (dark bubble)
- ✅ AI message starts streaming on left (white bubble)
- ✅ Streaming cursor (blinking line) visible during typing
- ✅ Auto-scroll follows streaming text
- ✅ Message completes without cursor
- ✅ Console shows: `[VidyaV3] Intent: educational_query`

### Test 1.4: Math/Science Formula Rendering

**Test Steps**:
1. Send: "Explain $E=mc^2$ to me"
2. Wait for response
3. Send: "What is $\\ce{H2O}$?"
4. Send: "Calculate $\\pu{5 m/s}$ conversion"

**Expected Results**:
- ✅ Math formulas render with KaTeX (styled)
- ✅ Chemistry formulas render correctly ($\ce{H2O}$)
- ✅ Physics units render with blue color ($\pu{5 m/s}$)
- ✅ Block formulas have subtle background and padding
- ✅ No raw LaTeX visible ($$, \ce{}, \pu{})

---

## Phase 2: Intent Classification Tests

### Test 2.1: Info Request Intent

**Test Queries** (Student Mode):
```
"Which question is the hardest?"
"How many questions are there?"
"Show me all topics"
"What's the answer to Question 5?"
```

**Expected Console Output**:
```
[VidyaV3] Intent: info_request Confidence: 0.8
[VidyaV3] Intent: info_request Confidence: 0.8
[VidyaV3] Intent: info_request Confidence: 0.8
[VidyaV3] Intent: info_request Confidence: 0.8
```

**Expected Response**:
- AI references context data (questions array)
- Provides specific answer based on difficulty scores
- Last query should NOT give direct answer (RBAC filtering)

### Test 2.2: Analysis Request Intent

**Test Queries** (Teacher Mode):
```
"Analyze difficulty distribution in KCET 2022"
"Compare all scanned papers"
"Show trends across exams"
"What patterns do you see in recurring questions?"
```

**Expected Console Output**:
```
[VidyaV3] Intent: analysis_request Confidence: 0.85
[VidyaV3] Intent: analysis_request Confidence: 0.85
[VidyaV3] Intent: analysis_request Confidence: 0.85
[VidyaV3] Intent: analysis_request Confidence: 0.85
```

**Expected Response**:
- Deep analytical insights
- References topic distribution, difficulty breakdown
- Statistical analysis if applicable
- Professional, data-driven tone

### Test 2.3: Action Request Intent

**Test Queries**:
```
"Open Board Mastermind"
"Generate sketches for this question"
"Export data to PDF"
"Navigate to analysis view"
```

**Expected Console Output**:
```
[VidyaV3] Intent: action_request Confidence: 0.9
[VidyaV3] Tool routing available but sending to Gemini for now: navigateTo
```

**Expected Response**:
- AI acknowledges action request
- Provides guidance (tool routing not active yet in Phase 3)
- Future: Direct tool execution

### Test 2.4: Educational Query Intent

**Test Queries** (Student Mode):
```
"Explain the concept of photosynthesis"
"How do I solve quadratic equations?"
"Teach me Newton's laws"
"What's the difference between mitosis and meiosis?"
```

**Expected Console Output**:
```
[VidyaV3] Intent: educational_query Confidence: 0.85
```

**Expected Response**:
- Clear, step-by-step explanations
- Uses examples from context if available
- Encouraging tone with emojis (student mode)
- Source attribution: [General concept] or [From: scan name]

### Test 2.5: Unclear Intent (Fallback)

**Test Queries**:
```
"Hello"
"Thanks!"
"hmm..."
"asdfghjkl"
```

**Expected Console Output**:
```
[VidyaV3] Intent: unclear Confidence: 0.5
```

**Expected Response**:
- AI still responds helpfully
- May ask for clarification
- Falls back to general guidance

---

## Phase 3: Quick Actions Tests

### Test 3.1: No Scanned Papers (Default Actions)

**Setup**: Clear all scanned papers or start fresh app

**Expected Quick Actions** (Student):
- "Getting Started" (HelpCircle icon)
- "General Study Tips" (BookOpen icon)

**Expected Quick Actions** (Teacher):
- "How to Upload Papers" (Upload icon)
- "Features Overview" (Info icon)

**Test Steps**:
1. Open chat
2. Verify only 2 default actions appear
3. Click "Getting Started"
4. Verify prompt is sent: "How can you help me study and prepare for exams?"

### Test 3.2: Single Scan Selected (Context-Aware Actions)

**Setup**: Select a scan (e.g., "KCET 2022") in Board Mastermind

**Expected Quick Actions** (Student):
- "Which is Hardest?" (Zap icon)
- "Study Tips" (BookOpen icon)
- "Topic Breakdown" (List icon)
- "Create Schedule" (Calendar icon)

**Expected Quick Actions** (Teacher):
- "Analyze KCET 2022..." (BarChart3 icon)
- "Generate Study Plan" (Calendar icon)
- "Teaching Insights" (Lightbulb icon)
- "Identify Weak Topics" (AlertCircle icon)

**Test Steps**:
1. Click each quick action
2. Verify correct prompt is sent
3. Verify response references the selected scan
4. Switch roles and verify actions update

### Test 3.3: Multiple Scans Available

**Expected Additional Action** (Teacher):
- "Cross-Scan Analysis" (TrendingUp icon)
- Prompt: "Compare difficulty and topic distribution across all X scanned papers"

**Test Steps**:
1. Verify action appears when multiple scans present
2. Click action
3. Verify AI compares across all scans

### Test 3.4: Recurring Questions Detected

**Expected Additional Actions**:
- Student: "Master Top Pattern" (Target icon)
- Teacher: "Recurring Questions" (Repeat icon)

**Test Steps**:
1. Ensure app has detected recurring questions (same question text in multiple scans)
2. Verify action appears
3. Click action
4. Verify AI references specific recurring question with frequency

### Test 3.5: Quick Actions Disabled State

**Test Steps**:
1. Send a message (AI starts typing)
2. Try to click quick actions
3. Verify actions are grayed out and non-clickable
4. Wait for response to complete
5. Verify actions become clickable again

---

## Phase 4: RBAC Security Tests

### Test 4.1: Student Context Filtering (Critical Security Test)

**Test Steps**:
1. Switch to Student mode
2. Send: "What are the correct answers for all questions?"
3. Open browser console
4. Check `[VidyaV3] Context payload` (if logged)
5. Verify `correctAnswer` fields are NOT present

**Expected Console Output**:
```
[VidyaV3] Security warnings: ['Detected answer-seeking query from student']
[RBAC Audit] { event: 'SUSPICIOUS_QUERY', role: 'student', query: '...' }
```

**Expected Response**:
- AI should say: "I can guide you to solve these questions, but I won't give direct answers. Let me help you understand..."
- Should provide learning guidance, not answers
- Should reference question topics and difficulty

### Test 4.2: Teacher Full Access

**Test Steps**:
1. Switch to Teacher mode
2. Send exact same query: "What are the correct answers for all questions?"
3. Check console for warnings (should be none)

**Expected Result**:
- No security warnings
- AI provides full analytical breakdown with answers
- Context includes `correctAnswer` fields

### Test 4.3: Data Category Access Validation

**Student Mode - Restricted Data**:

Test these queries and verify NO direct answers provided:
```
"What's the answer to Question 1?"
"Show me correct answers"
"Tell me which option is right"
```

**Expected Behavior**:
- Logged as suspicious
- Response guides learning instead
- Context has answers filtered

**Student Mode - Allowed Data**:

Test these queries and verify FULL access:
```
"Explain this concept"
"What topics should I study?"
"How difficult is this paper?"
"Show me all questions"
```

**Expected Behavior**:
- No warnings
- Full educational support
- Context includes questions, topics, difficulty

### Test 4.4: Action Permissions

**Student Mode - Restricted Actions**:
```
"Show me pedagogical insights"
"Analyze teaching strategies"
"Export all data to admin dashboard"
```

**Expected Console**:
```
[VidyaV3] Security warnings: ['Action pedagogical_planning not permitted for student role']
```

**Teacher Mode - Full Actions**:
- Same queries should work without restrictions

### Test 4.5: Role Switching Security

**Test Steps**:
1. Start in Student mode
2. Send: "What are the answers?"
3. Verify answers are NOT provided
4. Switch to Teacher mode (same session)
5. Repeat query
6. Verify answers ARE provided now

**Expected Behavior**:
- Context filtering updates immediately on role switch
- New chat session created with new system instruction
- Security validation uses new role

---

## Phase 5: Integration Tests

### Test 5.1: God Mode (Teacher) Integration

**Test Steps**:
1. Open app in God Mode
2. Navigate to different views:
   - Board Mastermind
   - Exam Analysis
   - Session Vault
3. Open Vidya in each view
4. Verify quick actions adapt to current view
5. Send queries referencing current view

**Expected Behavior**:
- Vidya appears in bottom-right in all views
- Quick actions reference current view context
- AI has access to view-specific data

### Test 5.2: Student Mode Integration

**Test Steps**:
1. Switch to Student mode
2. Complete a question module
3. Open Vidya
4. Ask about the current module

**Expected Behavior**:
- Vidya has context of current module
- Responses reference student progress
- Educational guidance provided

### Test 5.3: Feature Flag Toggle

**Test Steps**:
1. Open browser console
2. Run: `localStorage.setItem('edujourney_feature_flags', JSON.stringify({ useVidyaV3: false }))`
3. Refresh page
4. Verify VidyaV2 appears (old version)
5. Run: `localStorage.setItem('edujourney_feature_flags', JSON.stringify({ useVidyaV3: true }))`
6. Refresh page
7. Verify VidyaV3 appears

**Expected Behavior**:
- Smooth toggle between V2 and V3
- No data loss
- No console errors

---

## Phase 6: Edge Cases & Error Handling

### Test 6.1: Network Errors

**Test Steps**:
1. Open browser DevTools → Network tab
2. Set throttling to "Offline"
3. Send a message in Vidya
4. Wait 5 seconds

**Expected Behavior**:
- Error message appears in chat: "I encountered a network issue. Please try again."
- Error banner shows below messages
- User can retry after reconnecting

### Test 6.2: Empty Context

**Test Steps**:
1. Clear all scanned papers
2. Open Vidya
3. Send: "Analyze my papers"

**Expected Behavior**:
- AI politely informs no papers are available yet
- Suggests uploading papers
- No crashes or errors

### Test 6.3: Malformed Data

**Test Steps**:
1. Manually corrupt app context (via console):
   ```javascript
   // Inject invalid data
   ```
2. Send a query

**Expected Behavior**:
- Graceful fallback
- Error logged but doesn't break UI
- User can still interact with chat

### Test 6.4: Long Messages

**Test Steps**:
1. Send a very long message (>1000 characters)
2. Wait for response

**Expected Behavior**:
- Textarea handles long input
- Message sends successfully
- Response may be truncated at maxOutputTokens (800)

### Test 6.5: Rapid Message Sending

**Test Steps**:
1. Send 5 messages rapidly (spam Enter key)
2. Observe behavior

**Expected Behavior**:
- Messages queue properly
- No duplicate responses
- isTyping state prevents spam
- All messages get responses eventually

### Test 6.6: Clear Chat Mid-Response

**Test Steps**:
1. Send a query that triggers long response
2. Click "Clear Chat" while AI is typing
3. Observe behavior

**Expected Behavior**:
- Chat clears immediately
- Streaming stops
- New welcome message appears
- Chat session reinitialized
- No orphan messages

---

## Phase 7: Performance Tests

### Test 7.1: Context Payload Size

**Test Steps**:
1. Load 10+ scanned papers with 100+ questions
2. Open browser console → Network tab
3. Send a query in Vidya
4. Check payload size in Network request

**Expected Behavior**:
- Context payload < 50KB (compressed)
- Summarization working for large datasets
- Response time < 3 seconds

**Performance Benchmarks**:
- Small context (1 paper, 10 questions): < 1 second response
- Medium context (3 papers, 30 questions): < 2 seconds
- Large context (10 papers, 100 questions): < 5 seconds

### Test 7.2: Quick Actions Recomputation

**Test Steps**:
1. Open React DevTools → Profiler
2. Start recording
3. Select different scans repeatedly
4. Stop recording
5. Check VidyaV3 component re-renders

**Expected Behavior**:
- Quick actions only recompute when appContext or userRole changes
- useMemo prevents unnecessary recalculations
- Component re-renders are minimal

### Test 7.3: Memory Leaks

**Test Steps**:
1. Open/close chat 20 times
2. Send 50 messages
3. Clear chat 5 times
4. Check Chrome Task Manager for memory usage

**Expected Behavior**:
- Memory usage stabilizes (no continuous growth)
- No detached DOM nodes
- Chat sessions properly cleaned up

---

## Phase 8: Accessibility & UX Tests

### Test 8.1: Keyboard Navigation

**Test Steps**:
1. Use Tab key to navigate to Vidya FAB
2. Press Enter to open chat
3. Tab through UI elements
4. Use Enter to send message
5. Use Shift+Enter for newline in textarea

**Expected Behavior**:
- All interactive elements reachable via keyboard
- Focus visible (ring styles)
- Enter sends message
- Shift+Enter adds newline (not sends)

### Test 8.2: Screen Reader (Optional)

**Test Steps**:
1. Enable VoiceOver (Mac) or NVDA (Windows)
2. Navigate to Vidya
3. Listen to announcements

**Expected Behavior**:
- FAB button has descriptive label
- Messages are announced
- Roles are clear (user vs assistant)

### Test 8.3: Mobile Responsiveness

**Test Steps**:
1. Open app on mobile device or use DevTools mobile view
2. Open Vidya chat

**Expected Behavior**:
- Chat window scales appropriately (90vw on mobile)
- Touch interactions work smoothly
- FAB button positioned correctly
- Keyboard doesn't obscure input

---

## Test Results Template

Use this template to record test results:

```markdown
## Test Session: [Date]
**Tester**: [Name]
**Environment**: [Browser, OS, App Version]

### Test Results

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 1.1 | Chat Window Basics | ✅ PASS | Smooth animation |
| 1.2 | Role Switching | ✅ PASS | No issues |
| 1.3 | Message Streaming | ❌ FAIL | Streaming cursor not visible |
| ... | ... | ... | ... |

### Issues Found

1. **Issue**: Streaming cursor not visible
   - **Severity**: Low
   - **Steps to Reproduce**: Send message, watch for cursor
   - **Expected**: Blinking line during streaming
   - **Actual**: No cursor visible

2. **Issue**: ...

### Summary
- **Total Tests**: 50
- **Passed**: 48
- **Failed**: 2
- **Blocked**: 0

### Recommendations
- Fix streaming cursor visibility (check z-index)
- ...
```

---

## Automated Testing (Future Phase)

### Unit Tests
```typescript
// Example: Quick Actions Generator
describe('getQuickActions', () => {
  it('should return default actions when no context', () => {
    const actions = getQuickActions('student', emptyContext);
    expect(actions).toHaveLength(2);
    expect(actions[0].id).toBe('getting-started');
  });

  it('should return context-aware actions for teacher', () => {
    const actions = getQuickActions('teacher', mockContext);
    expect(actions).toContain(expect.objectContaining({ id: 'analyze-current-scan' }));
  });
});
```

### Integration Tests
```typescript
// Example: RBAC Filtering
describe('RBAC Security', () => {
  it('should filter correctAnswer for students', () => {
    const filtered = filterContextByRole(mockContext, 'student');
    expect(filtered.questions[0].correctAnswer).toBeUndefined();
  });

  it('should not filter for teachers', () => {
    const filtered = filterContextByRole(mockContext, 'teacher');
    expect(filtered.questions[0].correctAnswer).toBeDefined();
  });
});
```

---

## Success Criteria

VidyaV3 is production-ready when:
- ✅ All Phase 1-7 tests pass
- ✅ No critical security vulnerabilities
- ✅ Performance benchmarks met
- ✅ Zero console errors in normal usage
- ✅ Accessible via keyboard navigation
- ✅ Mobile responsive
- ✅ Documented edge cases handled gracefully

---

## Sign-Off Checklist

- [ ] All test phases completed
- [ ] Test results documented
- [ ] Critical issues resolved
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] User acceptance testing done
- [ ] Documentation updated
- [ ] Ready for production deployment

**Signed**: _______________
**Date**: _______________
