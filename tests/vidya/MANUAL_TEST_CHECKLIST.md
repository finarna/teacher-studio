# VidyaV3 Manual Test Checklist

**Date**: _____________
**Tester**: _____________
**Browser**: _____________
**Test Duration**: 1-2 hours

---

## Pre-Test Setup

- [ ] Dev server running at http://localhost:9002
- [ ] Browser console open (F12 → Console tab)
- [ ] React DevTools installed (optional but recommended)
- [ ] Clear localStorage: `localStorage.clear()`
- [ ] Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

## PHASE 1: Core Functionality Tests (15 minutes)

### Test 1.1: Chat Window Basics ⏱️ 2 min

**Steps**:
1. Open http://localhost:9002
2. Locate Vidya FAB button (bottom-right corner)
3. Click FAB button
4. Observe chat window opening animation
5. Check for welcome message
6. Click X button to close
7. Click FAB again to reopen

**Expected Results**:
- [ ] FAB button visible with robot icon
- [ ] Chat window opens with smooth scale animation
- [ ] Welcome message: "Fresh start! 🌟 What's next?" (Student) or "Ready for new instructions." (Teacher)
- [ ] Glassmorphism effect visible (backdrop blur)
- [ ] Chat closes smoothly when X clicked
- [ ] No console errors

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 1.2: Role Switching ⏱️ 3 min

**Steps**:
1. Open Vidya chat
2. Check current role (Student by default)
3. Click "Teacher" toggle button
4. Wait 1-2 seconds
5. Observe gradient change
6. Check for role transition message
7. Click "Student" toggle
8. Observe changes

**Expected Results**:
- [ ] Default role is "Student"
- [ ] Header gradient is indigo (Student mode)
- [ ] Clicking "Teacher" changes gradient to slate-900
- [ ] Role transition message appears: "Switched to Teacher mode..."
- [ ] Toggle button has active state styling
- [ ] Switching back to Student works
- [ ] Console shows: `[VidyaV3] Role switched to: teacher/student`

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 1.3: Message Sending & Streaming ⏱️ 5 min

**Steps**:
1. In Student mode, type: "How can you help me study?"
2. Press Enter (or click Send)
3. Watch for typing indicator
4. Observe streaming response
5. Wait for response to complete
6. Check auto-scroll behavior
7. Send another message: "What topics should I focus on?"

**Expected Results**:
- [ ] User message appears on right (dark bubble)
- [ ] Typing indicator shows (3 bouncing dots)
- [ ] AI message streams in on left (white bubble)
- [ ] Streaming cursor visible during typing
- [ ] Auto-scroll follows streaming text
- [ ] Message completes without cursor
- [ ] Console shows: `[VidyaV3] Intent: educational_query`
- [ ] Console shows: `[Performance] Message tracked { ... }`
- [ ] Response time < 5 seconds

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 1.4: Math/Science Formula Rendering ⏱️ 5 min

**Steps**:
1. Send: "Explain $E=mc^2$ to me"
2. Wait for response
3. Check if LaTeX renders
4. Send: "What is $\ce{H2O}$?"
5. Check chemistry formula
6. Send: "Convert $\pu{5 m/s}$ to km/h"

**Expected Results**:
- [ ] Math formula $E=mc^2$ renders properly (not raw LaTeX)
- [ ] Formula has nice styling (background, padding)
- [ ] Chemistry formula $\ce{H2O}$ renders with teal color
- [ ] Physics units render with blue color
- [ ] No `$$`, `\ce{}`, or `\pu{}` visible in rendered output
- [ ] Inline formulas work ($x^2$)

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

## PHASE 2: Intent Classification Tests (10 minutes)

### Test 2.1: Info Request Intent ⏱️ 3 min

**Test Queries**:
1. "Which question is the hardest?"
2. "How many questions are there?"
3. "Show me all topics"
4. "What's the correct answer?"

**Expected Results**:
- [ ] Console shows: `[VidyaV3] Intent: info_request` for all queries
- [ ] Confidence: 0.8 (80%)
- [ ] AI provides specific answers based on context
- [ ] Last query (answer) shows security warning for students

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 2.2: Analysis Request Intent ⏱️ 3 min

**Switch to Teacher Mode first**

**Test Queries**:
1. "Analyze difficulty distribution"
2. "Compare all scanned papers"
3. "Show trends in exam questions"

**Expected Results**:
- [ ] Console shows: `[VidyaV3] Intent: analysis_request`
- [ ] Confidence: 0.85 (85%)
- [ ] AI provides deep analytical insights
- [ ] Professional, data-driven tone

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 2.3: Educational Query Intent ⏱️ 4 min

**Switch to Student Mode**

**Test Queries**:
1. "Explain the concept of photosynthesis"
2. "How do I solve quadratic equations?"
3. "What's the difference between mitosis and meiosis?"

**Expected Results**:
- [ ] Console shows: `[VidyaV3] Intent: educational_query`
- [ ] Confidence: 0.85 (85%)
- [ ] Clear, step-by-step explanations
- [ ] Encouraging tone
- [ ] May include emojis (Student mode)

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

## PHASE 3: Quick Actions Tests (15 minutes)

### Test 3.1: Default Quick Actions (No Data) ⏱️ 3 min

**Setup**: Clear any scanned papers or start with empty state

**Steps**:
1. Open Vidya chat
2. Check quick actions below input area
3. Count number of actions
4. Click "Getting Started" (Student) or "How to Upload Papers" (Teacher)

**Expected Results**:
- [ ] 2 default actions visible
- [ ] Student: "Getting Started", "General Study Tips"
- [ ] Teacher: "How to Upload Papers", "Features Overview"
- [ ] Icons visible (HelpCircle, BookOpen, Upload, Info)
- [ ] Clicking action sends prompt to chat
- [ ] Response received

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 3.2: Context-Aware Quick Actions ⏱️ 5 min

**Setup**: Ensure at least 1 scanned paper is loaded

**Steps**:
1. Select a scan in Board Mastermind
2. Open Vidya
3. Check quick actions
4. Click first action
5. Verify prompt sent
6. Switch to Teacher mode
7. Check if actions changed

**Expected Results (Student)**:
- [ ] 3-4 context-aware actions
- [ ] Actions reference current scan name
- [ ] Examples: "Which is Hardest?", "Study Tips", "Topic Breakdown"
- [ ] Icons appropriate (Zap, BookOpen, List)

**Expected Results (Teacher)**:
- [ ] Different actions from Student
- [ ] Examples: "Analyze [scan]...", "Generate Study Plan", "Teaching Insights"
- [ ] Professional action labels

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 3.3: Quick Actions Disabled State ⏱️ 2 min

**Steps**:
1. Send a message
2. While AI is typing, try to click quick actions
3. Wait for response to complete
4. Try clicking again

**Expected Results**:
- [ ] Actions grayed out while isTyping = true
- [ ] Actions not clickable during response
- [ ] Actions become clickable after response
- [ ] Smooth visual feedback

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 3.4: Multiple Scans Available ⏱️ 5 min

**Setup**: Load 3+ scanned papers

**Steps**:
1. Open Vidya in Teacher mode
2. Don't select specific scan (view all)
3. Check for "Cross-Scan Analysis" action
4. Click the action
5. Verify response compares multiple scans

**Expected Results**:
- [ ] "Cross-Scan Analysis" action visible (Teacher mode)
- [ ] Action label mentions number of scans
- [ ] Clicking sends comparison prompt
- [ ] AI response references multiple scans
- [ ] Comparative analysis provided

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

## PHASE 4: RBAC Security Tests (15 minutes)

### Test 4.1: Student Context Filtering 🔒 ⏱️ 5 min

**CRITICAL SECURITY TEST**

**Steps**:
1. Switch to Student mode
2. Open browser console
3. Send: "What are the correct answers for all questions?"
4. Check console for security warning
5. Observe AI response

**Expected Results**:
- [ ] Console shows: `[VidyaV3] Security warnings: ['Detected answer-seeking query from student']`
- [ ] Console shows: `[RBAC Audit] { event: 'SUSPICIOUS_QUERY', role: 'student', query: '...' }`
- [ ] AI response does NOT provide direct answers
- [ ] AI says something like: "I can guide you to solve these questions, but I won't give direct answers..."
- [ ] Response provides learning guidance instead

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 4.2: Teacher Full Access ⏱️ 3 min

**Steps**:
1. Switch to Teacher mode
2. Send exact same query: "What are the correct answers for all questions?"
3. Check console (should be NO security warnings)
4. Observe AI response

**Expected Results**:
- [ ] NO security warnings in console
- [ ] AI provides full analytical breakdown WITH answers
- [ ] Professional, data-driven response
- [ ] Context includes correctAnswer fields (not filtered)

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 4.3: Role-Specific Data Access ⏱️ 4 min

**Student Mode Tests**:
1. Send: "Show me the correct answer to Question 1"
2. Send: "What's the answer?"
3. Send: "Tell me which option is right"

**Teacher Mode Tests**:
1. Send same queries
2. Compare responses

**Expected Results**:
- [ ] Student: All queries result in guidance (not answers)
- [ ] Student: Security warnings logged for each
- [ ] Teacher: Full access, answers provided
- [ ] Teacher: No security warnings

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 4.4: Permission Validation ⏱️ 3 min

**Steps**:
1. Student mode: Send "Export data to PDF"
2. Check if tool executes or shows permission error
3. Teacher mode: Send same query
4. Verify teacher can export

**Expected Results**:
- [ ] Student: Permission denied or AI suggests alternative
- [ ] Teacher: Export tool executes or AI confirms capability
- [ ] Proper permission checks in place

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

## PHASE 5: Tool Routing Tests (10 minutes)

### Test 5.1: Navigation Tool ⏱️ 3 min

**Steps**:
1. Send: "Open Board Mastermind"
2. Check console
3. Observe response time
4. Verify no Gemini API call made

**Expected Results**:
- [ ] Console shows: `[VidyaV3] Executing tool directly: navigateTo`
- [ ] Response appears instantly (<100ms)
- [ ] Response: "✅ Navigated to Board Mastermind"
- [ ] Custom event dispatched (check: `vidyaBackend.testAudit('TOOL_EXECUTED')`)
- [ ] NO Gemini streaming (bypassed)

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 5.2: Tool Routing vs Gemini ⏱️ 4 min

**Test A (Tool Route)**:
1. Send: "Go to analysis view"
2. Note response time

**Test B (Gemini Route)**:
1. Send: "Explain how analysis view works"
2. Note response time

**Expected Results**:
- [ ] Test A: <100ms response (tool execution)
- [ ] Test B: 1-3s response (Gemini)
- [ ] Test A: No streaming
- [ ] Test B: Streaming response
- [ ] Clear performance difference

**Actual Results**:
- Test A time: _______ ms
- Test B time: _______ ms

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 5.3: Tool Permission Check ⏱️ 3 min

**Steps**:
1. Student mode: "Export data to CSV"
2. Teacher mode: "Export data to CSV"

**Expected Results**:
- [ ] Student: Permission denied (exportData is teacher-only)
- [ ] Teacher: Tool executes successfully
- [ ] Proper error message for students

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

## PHASE 6: Performance Tests (15 minutes)

### Test 6.1: Context Caching ⏱️ 5 min

**Steps**:
1. Open console
2. Send: "Which question is hardest?"
3. Note console logs
4. Send exact same query again
5. Compare console logs

**Expected Results**:
- [ ] First query: `[Performance] Building new context`
- [ ] First query: `[Performance] Context built and cached { duration: '50-150ms', ... }`
- [ ] Second query: `[Performance] Context cache HIT { ... }`
- [ ] Second query: `[Performance] Context retrieved from cache { duration: '<1ms' }`
- [ ] Massive speed improvement on cache hit

**Actual Results**:
- First query duration: _______ ms
- Second query duration: _______ ms
- Cache hit: [ ] YES  [ ] NO

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 6.2: Performance Monitoring ⏱️ 5 min

**Steps**:
1. Send 5-10 messages (various queries)
2. Open console
3. Run: `vidyaPerf.report()`
4. Review output
5. Run: `vidyaPerf.health()`

**Expected Results**:
- [ ] `vidyaPerf` object exists
- [ ] Report shows: Total Queries, Avg Response Time, Avg Context Size, Cache Hit Rate
- [ ] Health check runs without errors
- [ ] Status: 'good', 'warning', or 'critical' with recommendations
- [ ] All metrics tracked correctly

**Performance Report Output**:
```
Total Queries: _______
Avg Response Time: _______ ms
Avg Context Size: _______ KB
Cache Hit Rate: _______ %
```

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 6.3: Context Compression ⏱️ 5 min

**Setup**: Load 100+ questions (if possible)

**Steps**:
1. Send a query
2. Check console for payload size
3. Run: `vidyaPerf.report()`
4. Check "Avg Context Size"

**Expected Results**:
- [ ] Context payload < 40 KB (compressed)
- [ ] Console shows: `questionCount: 50` (max limit)
- [ ] Console shows: `payloadSize: '20-40 KB'`
- [ ] No performance degradation with large datasets

**Actual Results**:
- Payload size: _______ KB
- Question count: _______

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

## PHASE 7: Conversation Memory Tests (10 minutes)

### Test 7.1: Auto-Save ⏱️ 3 min

**Steps**:
1. Have a conversation (5+ messages)
2. Open console
3. Run: `vidyaMemory.getAll()`
4. Check if conversation saved

**Expected Results**:
- [ ] `vidyaMemory` object exists
- [ ] Returns array with at least 1 session
- [ ] Session has id, title, messages, createdAt, updatedAt
- [ ] Title auto-generated from first user message
- [ ] All messages persisted

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 7.2: Persistence Across Refresh ⏱️ 4 min

**Steps**:
1. Have a conversation
2. Note first message content
3. Refresh page (F5)
4. Run: `vidyaMemory.getAll()`
5. Check if conversation still exists

**Expected Results**:
- [ ] Conversation persists after refresh
- [ ] All messages intact
- [ ] Timestamps preserved
- [ ] Can be loaded back: `vidyaMemory.getAll()[0]`

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 7.3: Search & Export ⏱️ 3 min

**Steps**:
1. Have multiple conversations
2. Run: `vidyaMemory.search('explain')`
3. Get session ID from result
4. Run: `vidyaMemory.export(sessionId)`

**Expected Results**:
- [ ] Search returns matching conversations
- [ ] Export returns markdown format
- [ ] Markdown includes all messages
- [ ] Format is readable

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

## PHASE 8: Error Handling & Edge Cases (10 minutes)

### Test 8.1: Network Error ⏱️ 3 min

**Steps**:
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Send a message
4. Wait 5 seconds
5. Restore network

**Expected Results**:
- [ ] Error message appears: "I encountered a network issue. Please try again."
- [ ] Error banner shows below messages
- [ ] User can retry after reconnecting
- [ ] No crash or frozen UI

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 8.2: Empty Context ⏱️ 2 min

**Steps**:
1. Clear all scanned papers (if possible)
2. Send: "Analyze my papers"

**Expected Results**:
- [ ] AI politely informs no papers available
- [ ] Suggests uploading papers
- [ ] No crashes or errors
- [ ] Default quick actions shown

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 8.3: Long Message ⏱️ 2 min

**Steps**:
1. Type a very long message (>1000 characters)
2. Send message

**Expected Results**:
- [ ] Textarea handles long input
- [ ] Message sends successfully
- [ ] Response may be truncated at maxOutputTokens (700)
- [ ] No UI breaking

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 8.4: Rapid Message Sending ⏱️ 3 min

**Steps**:
1. Type short message
2. Press Enter 5 times rapidly (spam)
3. Observe behavior

**Expected Results**:
- [ ] Messages queue properly
- [ ] No duplicate responses
- [ ] isTyping state prevents spam
- [ ] All messages eventually get responses
- [ ] No crashes

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

## PHASE 9: UI/UX Tests (10 minutes)

### Test 9.1: Responsive Design ⏱️ 3 min

**Steps**:
1. Resize browser window to mobile size (375px width)
2. Open Vidya
3. Test all functionality
4. Resize to tablet (768px)
5. Test again

**Expected Results**:
- [ ] Chat window scales appropriately (90vw on mobile)
- [ ] FAB button remains accessible
- [ ] Quick actions scroll horizontally
- [ ] Messages remain readable
- [ ] Input area functional

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 9.2: Keyboard Navigation ⏱️ 4 min

**Steps**:
1. Close Vidya
2. Press Tab repeatedly
3. When FAB is focused, press Enter
4. Tab through chat elements
5. Type message, press Enter to send
6. Try Shift+Enter for newline

**Expected Results**:
- [ ] Can reach FAB via Tab
- [ ] Enter opens chat
- [ ] All interactive elements reachable via Tab
- [ ] Focus visible (ring styles)
- [ ] Enter sends message
- [ ] Shift+Enter adds newline (doesn't send)

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

### Test 9.3: Clear Chat ⏱️ 3 min

**Steps**:
1. Have a conversation (5+ messages)
2. Click trash icon in header
3. Observe behavior

**Expected Results**:
- [ ] All messages cleared except welcome
- [ ] Chat session reinitialized
- [ ] Welcome message shows
- [ ] No errors in console

**Actual Results**:
_______________________________________________________

**Status**: [ ] PASS  [ ] FAIL  [ ] SKIP

---

## Final Checks (5 minutes)

### Console Error Check

**Steps**:
1. Review entire console log
2. Look for any errors or warnings

**Expected Results**:
- [ ] Zero errors related to VidyaV3
- [ ] Only expected warnings (performance logs, audit logs)
- [ ] No React errors or warnings

**Actual Results**:
_______________________________________________________

---

### Performance Summary

**Run**: `vidyaPerf.report()`

Record final statistics:
- Total Queries: _______
- Avg Response Time: _______ ms
- Avg Context Size: _______ KB
- Cache Hit Rate: _______ %
- Slowest Query: _______ ms
- Fastest Query: _______ ms

---

## TEST SUITE SUMMARY

| Phase | Tests | Passed | Failed | Skipped |
|-------|-------|--------|--------|---------|
| Phase 1: Core Functionality | 4 | ___ | ___ | ___ |
| Phase 2: Intent Classification | 3 | ___ | ___ | ___ |
| Phase 3: Quick Actions | 4 | ___ | ___ | ___ |
| Phase 4: RBAC Security | 4 | ___ | ___ | ___ |
| Phase 5: Tool Routing | 3 | ___ | ___ | ___ |
| Phase 6: Performance | 3 | ___ | ___ | ___ |
| Phase 7: Conversation Memory | 3 | ___ | ___ | ___ |
| Phase 8: Error Handling | 4 | ___ | ___ | ___ |
| Phase 9: UI/UX | 3 | ___ | ___ | ___ |
| **TOTAL** | **31** | **___** | **___** | **___** |

---

## Overall Assessment

**Pass Rate**: _______ % (Passed / Total)

**Critical Issues Found**:
1. _______________________________________________________
2. _______________________________________________________
3. _______________________________________________________

**Minor Issues Found**:
1. _______________________________________________________
2. _______________________________________________________
3. _______________________________________________________

**Recommendations**:
_______________________________________________________
_______________________________________________________
_______________________________________________________

---

## Sign-Off

**Tester**: _______________
**Date**: _______________
**Overall Status**: [ ] PASS  [ ] FAIL  [ ] NEEDS REVIEW

**Production Ready**: [ ] YES  [ ] NO  [ ] WITH FIXES

---

## Next Steps

If **PASS**:
- [ ] Deploy to staging environment
- [ ] Run regression tests
- [ ] Prepare for production rollout

If **FAIL**:
- [ ] Document all failures
- [ ] Create bug tickets
- [ ] Fix critical issues
- [ ] Retest
