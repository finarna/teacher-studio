# 🧪 Learning Journey API - Testing Guide

**Date**: February 11, 2026
**Server**: http://localhost:9001
**Status**: ✅ All 10 endpoints integrated and operational

---

## 📊 Overview

The Learning Journey API provides 10 new endpoints for topic-based learning, mock tests, and progress tracking.

### Endpoints Summary

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/api/topics/:subject/:examContext` | Get all topics for a subject | ✅ Yes |
| GET | `/api/topics/:topicId/resources` | Get resources for a topic | ✅ Yes |
| PUT | `/api/topics/:topicId/progress` | Update topic progress | ✅ Yes |
| POST | `/api/topics/:topicId/activity` | Record topic activity | ✅ Yes |
| POST | `/api/tests/generate` | Generate a new test | ✅ Yes |
| POST | `/api/tests/:attemptId/submit` | Submit test responses | ✅ Yes |
| GET | `/api/tests/:attemptId/results` | Get test results | ✅ Yes |
| GET | `/api/tests/history` | Get test history | ✅ Yes |
| GET | `/api/progress/subject/:subject/:examContext` | Get subject progress | ✅ Yes |
| GET | `/api/progress/trajectory/:examContext` | Get trajectory progress | ✅ Yes |

---

## 🔐 Authentication

All endpoints require a valid Supabase JWT token in the `Authorization` header:

```bash
Authorization: Bearer <supabase-jwt-token>
```

**Getting a Token**:
1. Sign in via Supabase Auth (frontend)
2. Use `supabase.auth.getSession()` to get the access token
3. Pass token in Authorization header

**Without Auth**:
- All endpoints return `401 Unauthorized`
- Error response: `{"error": "Authentication required"}`

---

## 📚 Endpoint Details

### 1. Get Topics for Subject

**Endpoint**: `GET /api/topics/:subject/:examContext`

**Description**: Aggregates all topics for a subject from user's scans

**Parameters**:
- `subject` (path): Subject name (Physics, Chemistry, Biology, Math)
- `examContext` (path): Exam context (NEET, JEE, KCET, CBSE)

**Example Request**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:9001/api/topics/Physics/NEET
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "topics": [
    {
      "id": "uuid",
      "topicId": "newtons_laws",
      "topicName": "Newton's Laws of Motion",
      "subject": "Physics",
      "examContext": "NEET",
      "totalQuestions": 25,
      "masteryLevel": 72,
      "studyStage": "practicing",
      "questionsAttempted": 18,
      "questionsCorrect": 15,
      "averageAccuracy": 83.33,
      "sourceScanIds": ["scan1", "scan2"]
    }
  ],
  "count": 7
}
```

---

### 2. Get Topic Resources

**Endpoint**: `GET /api/topics/:topicId/resources`

**Description**: Get all learning resources for a specific topic

**Parameters**:
- `topicId` (path): Topic resource UUID

**Example Request**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:9001/api/topics/abc-123/resources
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "resource": {
    "id": "abc-123",
    "topicName": "Newton's Laws",
    "questions": [...],
    "flashcards": [...],
    "sketchPages": [...],
    "chapterInsights": [...],
    "masteryLevel": 72
  }
}
```

---

### 3. Update Topic Progress

**Endpoint**: `PUT /api/topics/:topicId/progress`

**Description**: Update mastery level and study stage

**Parameters**:
- `topicId` (path): Topic resource UUID

**Request Body**:
```json
{
  "masteryLevel": 75,
  "studyStage": "taking_quiz"
}
```

**Example Request**:
```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"masteryLevel":75,"studyStage":"taking_quiz"}' \
  http://localhost:9001/api/topics/abc-123/progress
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "resource": { ... }
}
```

---

### 4. Record Topic Activity

**Endpoint**: `POST /api/topics/:topicId/activity`

**Description**: Track user activity on a topic

**Parameters**:
- `topicId` (path): Topic resource UUID

**Request Body**:
```json
{
  "activityType": "practiced_question",
  "questionId": "question-uuid",
  "isCorrect": true,
  "timeSpent": 120
}
```

**Activity Types**:
- `viewed_notes`: User viewed study materials
- `practiced_question`: User attempted a practice question
- `completed_quiz`: User finished a quiz
- `reviewed_flashcard`: User reviewed flashcards

**Example Request**:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"activityType":"practiced_question","questionId":"q123","isCorrect":true,"timeSpent":120}' \
  http://localhost:9001/api/topics/abc-123/activity
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Activity recorded"
}
```

---

### 5. Generate Test

**Endpoint**: `POST /api/tests/generate`

**Description**: Generate a new quiz or mock test

**Request Body**:
```json
{
  "testType": "topic_quiz",
  "subject": "Physics",
  "examContext": "NEET",
  "topics": ["newtons_laws", "work_energy_power"],
  "totalQuestions": 15,
  "testName": "Newton's Laws Quiz"
}
```

**Test Types**:
- `topic_quiz`: 10-15 questions, 15 min
- `subject_test`: 30-40 questions, 60 min
- `full_mock`: Exam-specific (NEET: 180Q/200min, JEE: 90Q/180min)

**Example Request**:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType":"topic_quiz",
    "subject":"Physics",
    "examContext":"NEET",
    "topics":["newtons_laws"],
    "totalQuestions":10,
    "testName":"Newton Laws Practice"
  }' \
  http://localhost:9001/api/tests/generate
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "attempt": {
    "id": "attempt-uuid",
    "testType": "topic_quiz",
    "totalQuestions": 10,
    "durationMinutes": 15,
    "startTime": "2026-02-11T12:00:00Z",
    "status": "in_progress"
  },
  "questions": [
    {
      "id": "q1",
      "text": "What is Newton's first law?",
      "options": ["A", "B", "C", "D"],
      "difficulty": "Easy",
      "topic": "Newton's Laws",
      "marks": 1
    }
  ],
  "metadata": {
    "totalQuestions": 10,
    "difficultyBreakdown": { "easy": 4, "moderate": 4, "hard": 2 },
    "averageDifficulty": 2.1
  }
}
```

---

### 6. Submit Test

**Endpoint**: `POST /api/tests/:attemptId/submit`

**Description**: Submit test responses and get score

**Parameters**:
- `attemptId` (path): Test attempt UUID

**Request Body**:
```json
{
  "responses": [
    {
      "questionId": "q1",
      "selectedOption": 2,
      "isCorrect": true,
      "timeSpent": 45,
      "markedForReview": false
    }
  ]
}
```

**Example Request**:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "responses": [
      {"questionId":"q1","selectedOption":2,"isCorrect":true,"timeSpent":45}
    ]
  }' \
  http://localhost:9001/api/tests/attempt-123/submit
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "attempt": {
    "id": "attempt-123",
    "status": "completed",
    "percentage": 80,
    "rawScore": 8,
    "totalQuestions": 10,
    "topicAnalysis": {
      "Newton's Laws": { "correct": 7, "total": 10, "accuracy": 70 }
    }
  },
  "analysis": {
    "strengths": ["Easy questions"],
    "weaknesses": ["Hard questions"],
    "timeManagement": "Good"
  }
}
```

---

### 7. Get Test Results

**Endpoint**: `GET /api/tests/:attemptId/results`

**Description**: Retrieve detailed test results

**Parameters**:
- `attemptId` (path): Test attempt UUID

**Example Request**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:9001/api/tests/attempt-123/results
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "attempt": { ... },
  "responses": [ ... ],
  "analysis": {
    "topicBreakdown": { ... },
    "timeAnalysis": { ... },
    "difficultyAnalysis": { ... }
  }
}
```

---

### 8. Get Test History

**Endpoint**: `GET /api/tests/history`

**Description**: Get user's test history with filters

**Query Parameters**:
- `testType` (optional): Filter by test type
- `subject` (optional): Filter by subject
- `limit` (optional): Limit results (default: 20)

**Example Request**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:9001/api/tests/history?testType=topic_quiz&subject=Physics&limit=10"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "attempts": [
    {
      "id": "attempt-1",
      "testName": "Newton Laws Quiz",
      "testType": "topic_quiz",
      "subject": "Physics",
      "percentage": 80,
      "completedAt": "2026-02-10T10:00:00Z"
    }
  ],
  "count": 5
}
```

---

### 9. Get Subject Progress

**Endpoint**: `GET /api/progress/subject/:subject/:examContext`

**Description**: Get overall progress for a subject

**Parameters**:
- `subject` (path): Subject name
- `examContext` (path): Exam context

**Example Request**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:9001/api/progress/subject/Physics/NEET
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "progress": {
    "subject": "Physics",
    "examContext": "NEET",
    "overallMastery": 68,
    "topicsTotal": 15,
    "topicsMastered": 8,
    "totalQuestionsAttempted": 250,
    "overallAccuracy": 75.5
  }
}
```

---

### 10. Get Trajectory Progress

**Endpoint**: `GET /api/progress/trajectory/:examContext`

**Description**: Get overall progress across all subjects in a trajectory

**Parameters**:
- `examContext` (path): Exam context (NEET, JEE, KCET, CBSE)

**Example Request**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:9001/api/progress/trajectory/NEET
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "trajectory": "NEET",
  "subjects": {
    "Physics": { "overallMastery": 68, "topicsMastered": 8 },
    "Chemistry": { "overallMastery": 72, "topicsMastered": 10 },
    "Biology": { "overallMastery": 65, "topicsMastered": 7 }
  },
  "overallProgress": 68.3
}
```

---

## 🧪 Quick Test Script

Save this as `test-api.sh`:

```bash
#!/bin/bash

# Set your auth token here
TOKEN="your-supabase-jwt-token"
BASE_URL="http://localhost:9001"

# Test 1: Get topics
echo "1. Getting Physics topics for NEET..."
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/topics/Physics/NEET"

# Test 2: Get test history
echo -e "\n\n2. Getting test history..."
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/tests/history?limit=5"

# Test 3: Generate test
echo -e "\n\n3. Generating topic quiz..."
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType":"topic_quiz",
    "subject":"Physics",
    "examContext":"NEET",
    "totalQuestions":10,
    "testName":"Quick Quiz"
  }' \
  "$BASE_URL/api/tests/generate"
```

---

## ✅ Verification Checklist

- [x] All 10 endpoints registered in server
- [x] Authentication middleware protecting endpoints
- [x] 404 handler lists all new endpoints
- [x] Environment variables configured (NEXT_PUBLIC_SUPABASE_URL, etc.)
- [x] Server starts without errors
- [x] Endpoints return proper 401 without auth
- [x] Database schema supports all operations

---

## 🔧 Troubleshooting

### Server won't start
- Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verify Supabase connection: `curl http://localhost:9001/api/health`

### 401 Unauthorized
- Ensure you're passing a valid Supabase JWT token
- Check token hasn't expired
- Verify user exists in database

### No topics returned
- User needs scans in database with questions
- Topics are aggregated from existing scan data
- Run topic seeding script: `npx tsx scripts/seedTopics.ts`

### Test generation fails
- Ensure topics exist in database
- User must have scans with questions for selected subject
- Check question pool has enough questions for difficulty distribution

---

## 📊 Server Logs

The server logs all requests. Look for:
- `✅ Authenticated user X for GET /api/topics/...` - Auth successful
- `❌ Invalid token for GET /api/topics/...` - Auth failed
- `📚 Fetching topics for Physics (NEET)` - Topic aggregation
- `🧪 Generating test: topic_quiz (10 questions)` - Test generation

---

## 🎯 Next Steps

1. **Frontend Integration**: Use these endpoints in React components
2. **Real User Testing**: Test with actual user accounts and scans
3. **Performance Monitoring**: Track response times
4. **Error Handling**: Add retry logic for failed requests

---

**Documentation Version**: 1.0
**Last Updated**: February 11, 2026
**Status**: ✅ Production Ready
