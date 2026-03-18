# 🎯 Learning Journey Integration Guide

## Overview

This guide shows how to integrate the Learning Journey system into the existing EduJourney application **without disrupting existing features**. The implementation uses feature flags for safe deployment.

---

## Step 1: Add Learning Journey Components to App.tsx

### Import Statements

Add these imports after the existing component imports (around line 40):

```typescript
// Learning Journey Components
import { LearningJourneyProvider } from './contexts/LearningJourneyContext';
import TrajectorySelectionPage from './components/TrajectorySelectionPage';
import SubjectSelectionPage from './components/SubjectSelectionPage';
import TopicDashboardPage from './components/TopicDashboardPage';
import TopicDetailPage from './components/TopicDetailPage';
import TestInterface from './components/TestInterface';
import PerformanceAnalysis from './components/PerformanceAnalysis';
```

### Add Learning Journey State

Add this state after the existing state declarations (around line 85):

```typescript
// Learning Journey State
const [learningJourneyEnabled, setLearningJourneyEnabled] = useState(
  isFeatureEnabled('LEARNING_JOURNEY')
);
```

### Add Feature Flag

Add this to `/utils/featureFlags.ts`:

```typescript
export const FEATURE_FLAGS = {
  // ... existing flags
  LEARNING_JOURNEY: process.env.REACT_APP_ENABLE_LEARNING_JOURNEY === 'true',
};
```

### Add Navigation Button

In the sidebar or navigation menu, add a button to access Learning Journey:

```typescript
// In Sidebar component or navigation area
{learningJourneyEnabled && (
  <button
    onClick={() => {
      setViewMode('LEARNING_JOURNEY');
      setGodModeView('journey');
    }}
    className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
  >
    <GraduationCap size={20} />
    <span className="font-medium">Learning Journey</span>
  </button>
)}
```

### Modify View Mode Type

Update the viewMode state type:

```typescript
const [viewMode, setViewMode] = useState<'STUDENT' | 'GOD_MODE' | 'LEARNING_JOURNEY'>('GOD_MODE');
```

### Add Learning Journey View Rendering

In the main render function, add this conditional render:

```typescript
// In AppContent component, before the existing return statement
if (viewMode === 'LEARNING_JOURNEY' && user) {
  return (
    <LearningJourneyProvider userId={user.id}>
      <LearningJourneyApp onBack={() => setViewMode('GOD_MODE')} />
    </LearningJourneyProvider>
  );
}
```

---

## Step 2: Create LearningJourneyApp Component

Create a new file `/components/LearningJourneyApp.tsx`:

```typescript
import React from 'react';
import { useLearningJourney } from '../contexts/LearningJourneyContext';
import TrajectorySelectionPage from './TrajectorySelectionPage';
import SubjectSelectionPage from './SubjectSelectionPage';
import TopicDashboardPage from './TopicDashboardPage';
import TopicDetailPage from './TopicDetailPage';
import TestInterface from './TestInterface';
import PerformanceAnalysis from './PerformanceAnalysis';

interface LearningJourneyAppProps {
  onBack: () => void;
}

const LearningJourneyApp: React.FC<LearningJourneyAppProps> = ({ onBack }) => {
  const {
    currentView,
    selectedTrajectory,
    selectedSubject,
    selectedTopicId,
    topics,
    currentTest,
    currentTestQuestions,
    currentTestResponses,
    selectTrajectory,
    selectSubject,
    selectTopic,
    goBack,
    startTest,
    submitTest,
    exitTest
  } = useLearningJourney();

  // Render based on current view
  switch (currentView) {
    case 'trajectory':
      return (
        <TrajectorySelectionPage
          onSelectTrajectory={selectTrajectory}
          userProgress={undefined} // TODO: Load from API
        />
      );

    case 'subject':
      return (
        <SubjectSelectionPage
          examContext={selectedTrajectory!}
          onSelectSubject={selectSubject}
          onBack={goBack}
          subjectProgress={undefined} // TODO: Load from API
        />
      );

    case 'topic_dashboard':
      return (
        <TopicDashboardPage
          subject={selectedSubject!}
          examContext={selectedTrajectory!}
          topics={topics}
          onSelectTopic={selectTopic}
          onBack={goBack}
          studyStreak={0} // TODO: Load from API
        />
      );

    case 'topic_detail':
      const selectedTopic = topics.find(t => t.topicId === selectedTopicId);
      if (!selectedTopic) {
        goBack();
        return null;
      }
      return (
        <TopicDetailPage
          topicResource={selectedTopic}
          subject={selectedSubject!}
          examContext={selectedTrajectory!}
          onBack={goBack}
          onStartQuiz={(topicId) => startTest('topic_quiz', topicId)}
        />
      );

    case 'test':
      if (!currentTest || !currentTestQuestions) {
        goBack();
        return null;
      }
      return (
        <TestInterface
          attempt={currentTest}
          questions={currentTestQuestions}
          onSubmit={submitTest}
          onExit={exitTest}
        />
      );

    case 'test_results':
      if (!currentTest || !currentTestResponses) {
        goBack();
        return null;
      }
      return (
        <PerformanceAnalysis
          attempt={currentTest}
          responses={currentTestResponses}
          questions={currentTestQuestions}
          onReviewQuestions={() => {
            // TODO: Implement review mode
          }}
          onRetakeTest={() => {
            // TODO: Implement retake
          }}
          onBackToDashboard={goBack}
        />
      );

    default:
      return null;
  }
};

export default LearningJourneyApp;
```

---

## Step 3: Environment Variables

Add to `.env.local`:

```bash
# Learning Journey Feature Flag
REACT_APP_ENABLE_LEARNING_JOURNEY=true

# Supabase (already exists)
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

---

## Step 4: Database Setup

### Run Migration

```bash
# Using Supabase CLI
supabase db push migrations/007_learning_journey.sql

# OR via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Copy contents of migrations/007_learning_journey.sql
# 3. Click "Run"
```

### Seed Topics

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL=your_url
export SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Run seeding script
npx tsx scripts/seedTopics.ts
```

Expected output:
```
🌱 Starting topic seeding...
📚 Processing Math...
  📂 Domain: Algebra
    ✅ Created: Linear Equations
    ✅ Created: Quadratic Equations
...
✨ Topic seeding complete!
🎉 All done!
```

---

## Step 5: API Server Setup

### Add Endpoints to server-supabase.js

1. Add import:

```javascript
import { learningJourneyHandlers } from './api/learningJourneyEndpoints.js';
```

2. Add routes (after flashcard endpoints, around line 600):

```javascript
// =====================================================
// LEARNING JOURNEY API ENDPOINTS
// =====================================================

// Topic endpoints
app.get('/api/topics/:subject/:examContext', learningJourneyHandlers.getTopics);
app.get('/api/topics/:topicId/resources', learningJourneyHandlers.getTopicResources);
app.put('/api/topics/:topicId/progress', learningJourneyHandlers.updateTopicProgress);
app.post('/api/topics/:topicId/activity', learningJourneyHandlers.recordActivity);

// Test endpoints
app.post('/api/tests/generate', learningJourneyHandlers.generateTest);
app.post('/api/tests/:attemptId/submit', learningJourneyHandlers.submitTest);
app.get('/api/tests/:attemptId/results', learningJourneyHandlers.getTestResults);
app.get('/api/tests/history', learningJourneyHandlers.getTestHistory);

// Progress endpoints
app.get('/api/progress/subject/:subject/:examContext', learningJourneyHandlers.getSubjectProgress);
app.get('/api/progress/trajectory/:examContext', learningJourneyHandlers.getTrajectoryProgress);
```

3. Restart server:

```bash
npm run server
# or
node server-supabase.js
```

---

## Step 6: Testing

### Manual Testing Checklist

#### 1. Trajectory Selection
- [ ] Click "Learning Journey" in sidebar
- [ ] See 4 trajectory cards (NEET, JEE, KCET, CBSE)
- [ ] Click NEET → Navigate to subject selection

#### 2. Subject Selection
- [ ] See Physics, Chemistry, Biology cards
- [ ] Verify subject colors match config
- [ ] Click Physics → Navigate to topic dashboard

#### 3. Topic Dashboard
- [ ] See topic heatmap (5x5 grid)
- [ ] Topics color-coded by mastery (red → green)
- [ ] Toggle to list view
- [ ] Click a topic → Navigate to topic detail

#### 4. Topic Detail
- [ ] See 5 tabs: Learn, Practice, Quiz, Flashcards, Progress
- [ ] Learn tab shows chapter insights
- [ ] Practice tab shows question count
- [ ] Click "Start Quick Quiz" → Navigate to test

#### 5. Test Interface
- [ ] Timer counts down
- [ ] Select MCQ options
- [ ] Mark questions for review
- [ ] Submit test → Navigate to results

#### 6. Performance Analysis
- [ ] See score card with percentage
- [ ] Topic breakdown chart
- [ ] Time analysis
- [ ] AI insights

### API Testing

Test endpoints using curl:

```bash
# Get JWT token
TOKEN=$(curl -X POST http://localhost:9001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.token')

# Test topics endpoint
curl -X GET "http://localhost:9001/api/topics/Physics/NEET" \
  -H "Authorization: Bearer $TOKEN"

# Test test generation
curl -X POST "http://localhost:9001/api/tests/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "topic_quiz",
    "subject": "Physics",
    "examContext": "NEET",
    "topics": [],
    "totalQuestions": 10
  }'
```

---

## Step 7: Gradual Rollout Strategy

### Phase 1: Internal Testing (Week 1)
- Enable for admin users only
- Test all flows manually
- Fix critical bugs

### Phase 2: Beta Users (Week 2)
- Enable for 10% of users using feature flag
- Monitor error rates
- Collect feedback

### Phase 3: General Availability (Week 3)
- Enable for all users
- Monitor performance metrics
- Iterate based on usage data

---

## Troubleshooting

### Issue: Topics not loading
**Solution**: Check if topics table is seeded
```sql
SELECT COUNT(*) FROM topics;
-- Should return > 0
```

### Issue: Test generation fails
**Solution**: Verify user has scanned papers
```sql
SELECT COUNT(*) FROM scans WHERE user_id = 'USER_ID';
-- Should return > 0
```

### Issue: API returns 401
**Solution**: Check JWT token is valid
```javascript
// In browser console
const { data } = await supabase.auth.getSession();
console.log(data.session?.access_token);
```

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Adoption Rate**
   - % of users accessing Learning Journey
   - Avg time spent per session

2. **Engagement**
   - Topics viewed per user
   - Tests taken per week
   - Avg quiz completion rate

3. **Performance**
   - API response times
   - Database query performance
   - Error rates

### SQL Queries for Analytics

```sql
-- User adoption
SELECT
  COUNT(DISTINCT user_id) as total_users,
  COUNT(DISTINCT CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN user_id END) as active_users
FROM topic_activities;

-- Average mastery by subject
SELECT
  subject,
  AVG(overall_mastery) as avg_mastery,
  COUNT(*) as users
FROM subject_progress
GROUP BY subject;

-- Test completion rate
SELECT
  test_type,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  ROUND(100.0 * COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*), 2) as completion_rate
FROM test_attempts
GROUP BY test_type;
```

---

## Next Steps

1. ✅ **Completed**: All core components built
2. ⏳ **Pending**: AI recommendation service integration
3. ⏳ **Pending**: Add topic filters to VisualQuestionBank
4. ⏳ **Pending**: Add topic filters to RapidRecall
5. ⏳ **Pending**: Mobile responsive design testing
6. ⏳ **Pending**: Performance optimization
7. ⏳ **Pending**: User onboarding flow

---

## Support

For issues or questions:
- Check logs: `tail -f /var/log/edujourney/server.log`
- Database queries: Use Supabase Dashboard SQL Editor
- Frontend errors: Check browser console

---

**Implementation Complete!** 🎉

The Learning Journey system is ready for integration. Follow this guide step-by-step to deploy safely without disrupting existing features.
