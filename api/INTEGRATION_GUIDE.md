# Learning Journey API Integration Guide

## Step 1: Add imports to server-supabase.js

Add this import at the top of `server-supabase.js` (after existing imports):

```javascript
import { learningJourneyHandlers } from './api/learningJourneyEndpoints.js';
```

## Step 2: Add routes to server-supabase.js

Add these routes after the existing `/api/flashcards` endpoints (around line 600):

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

## Step 3: Run database migration

Execute the migration file:

```bash
# Using Supabase CLI
supabase db push migrations/007_learning_journey.sql

# OR execute directly in Supabase dashboard SQL editor
# Copy contents of migrations/007_learning_journey.sql and run
```

## Step 4: Seed topics

Run the seeding script:

```bash
# Set environment variables first
export NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run seeding script
npx tsx scripts/seedTopics.ts
```

## Step 5: Test the endpoints

### Test Topic Retrieval
```bash
curl -X GET "http://localhost:9001/api/topics/Physics/NEET" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Test Generation
```bash
curl -X POST "http://localhost:9001/api/tests/generate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "topic_quiz",
    "subject": "Physics",
    "examContext": "NEET",
    "topics": ["kinematics"],
    "totalQuestions": 10,
    "durationMinutes": 15
  }'
```

### Test Progress Retrieval
```bash
curl -X GET "http://localhost:9001/api/progress/subject/Physics/NEET" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## API Endpoint Reference

### Topics
- `GET /api/topics/:subject/:examContext` - Get all topics for subject
- `GET /api/topics/:topicId/resources` - Get topic resources
- `PUT /api/topics/:topicId/progress` - Update topic progress
- `POST /api/topics/:topicId/activity` - Record learning activity

### Tests
- `POST /api/tests/generate` - Generate new test
- `POST /api/tests/:attemptId/submit` - Submit test responses
- `GET /api/tests/:attemptId/results` - Get test results
- `GET /api/tests/history` - Get test history

### Progress
- `GET /api/progress/subject/:subject/:examContext` - Get subject progress
- `GET /api/progress/trajectory/:examContext` - Get trajectory progress

## Notes

- All endpoints require authentication (JWT token in Authorization header)
- The server will automatically create `topic_resources` entries when users practice questions
- Mastery levels are calculated automatically by database triggers
- Test responses are saved atomically to prevent data loss
