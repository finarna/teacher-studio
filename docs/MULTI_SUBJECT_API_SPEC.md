# Multi-Subject API Specification

**Complete API reference for backend endpoints supporting multi-subject architecture.**

---

## Overview

This document describes the API changes required to support multi-subject and multi-exam functionality. All endpoints maintain backward compatibility while adding new filtering and validation capabilities.

**Base URL:** `http://localhost:9001/api` (development)

**Content-Type:** `application/json`

---

## Endpoints

### 1. Scans

#### `GET /api/scans`

**Description:** Fetch all scans, optionally filtered by subject and exam context.

**Query Parameters:**

| Parameter | Type | Required | Values | Description |
|-----------|------|----------|--------|-------------|
| `subject` | string | No | `Math`, `Physics`, `Chemistry`, `Biology` | Filter scans by subject |
| `examContext` | string | No | `KCET`, `NEET`, `JEE`, `CBSE` | Filter scans by exam |

**Example Requests:**

```bash
# Get all scans
GET /api/scans

# Get all Physics scans
GET /api/scans?subject=Physics

# Get all KCET scans
GET /api/scans?examContext=KCET

# Get Physics KCET scans
GET /api/scans?subject=Physics&examContext=KCET
```

**Response:**

```json
[
  {
    "id": "scan-uuid-1",
    "name": "KCET 2023 Physics",
    "date": "2024-01-15",
    "timestamp": 1705334400000,
    "status": "Complete",
    "grade": "Class 12",
    "subject": "Physics",
    "examContext": "KCET",
    "analysisData": {
      "summary": "...",
      "questions": [
        {
          "id": "q1",
          "text": "...",
          "topic": "Mechanics",
          "difficulty": "Moderate"
        }
      ]
    }
  }
]
```

**Status Codes:**

- `200 OK` - Success
- `500 Internal Server Error` - Redis connection failed

---

#### `POST /api/scans`

**Description:** Save a new scan with subject and exam context.

**Request Body:**

```json
{
  "id": "scan-uuid-123",
  "name": "KCET 2024 Physics",
  "date": "2024-01-20",
  "timestamp": 1705766400000,
  "status": "Complete",
  "grade": "Class 12",
  "subject": "Physics",
  "examContext": "KCET",
  "analysisData": {
    "summary": "Analysis of KCET 2024 Physics paper",
    "overallDifficulty": "Moderate",
    "questions": [...]
  }
}
```

**Required Fields:**

- `id` (string) - Unique scan identifier
- `subject` (string) - Must be one of: `Math`, `Physics`, `Chemistry`, `Biology`
- `examContext` (string) - Must be one of: `KCET`, `NEET`, `JEE`, `CBSE`
- `grade` (string) - e.g., `Class 12`

**Validation Rules:**

1. `examContext` must be provided
2. `examContext` must be valid: `KCET | NEET | JEE | CBSE`
3. `subject` must be compatible with `examContext`:
   - KCET: All subjects
   - NEET: Physics, Chemistry, Biology only
   - JEE: Math, Physics, Chemistry only
   - CBSE: All subjects

**Response (Success):**

```json
{
  "success": true,
  "id": "scan-uuid-123"
}
```

**Response (Error - Missing examContext):**

```json
{
  "error": "examContext is required",
  "hint": "Must be one of: KCET, NEET, JEE, CBSE"
}
```

**Response (Error - Invalid examContext):**

```json
{
  "error": "Invalid examContext: XYZ",
  "valid": ["KCET", "NEET", "JEE", "CBSE"]
}
```

**Response (Error - Incompatible Subject-Exam):**

```json
{
  "error": "Invalid subject-exam combination",
  "details": "Math is not available for NEET exam",
  "validSubjects": ["Physics", "Chemistry", "Biology"]
}
```

**Status Codes:**

- `200 OK` - Scan saved successfully
- `400 Bad Request` - Validation failed
- `500 Internal Server Error` - Redis save failed

---

#### `GET /api/scans/:id`

**Description:** Fetch a specific scan by ID.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Scan unique identifier |

**Example Request:**

```bash
GET /api/scans/scan-uuid-123
```

**Response:**

```json
{
  "id": "scan-uuid-123",
  "name": "KCET 2024 Physics",
  "subject": "Physics",
  "examContext": "KCET",
  "analysisData": {...}
}
```

**Status Codes:**

- `200 OK` - Scan found
- `404 Not Found` - Scan doesn't exist
- `500 Internal Server Error` - Redis error

---

#### `DELETE /api/scans/:id`

**Description:** Delete a scan by ID.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Scan unique identifier |

**Example Request:**

```bash
DELETE /api/scans/scan-uuid-123
```

**Response:**

```json
{
  "success": true,
  "id": "scan-uuid-123",
  "message": "Scan deleted successfully"
}
```

**Status Codes:**

- `200 OK` - Deleted successfully
- `404 Not Found` - Scan doesn't exist
- `500 Internal Server Error` - Redis error

---

### 2. Statistics

#### `GET /api/stats/subjects`

**Description:** Get aggregated statistics for all subjects.

**Example Request:**

```bash
GET /api/stats/subjects
```

**Response:**

```json
{
  "Math": {
    "scans": 15,
    "questions": 900,
    "exams": {
      "KCET": 10,
      "JEE": 5
    }
  },
  "Physics": {
    "scans": 20,
    "questions": 1200,
    "exams": {
      "KCET": 12,
      "NEET": 5,
      "JEE": 3
    }
  },
  "Chemistry": {
    "scans": 18,
    "questions": 1080,
    "exams": {
      "KCET": 10,
      "NEET": 8
    }
  },
  "Biology": {
    "scans": 12,
    "questions": 720,
    "exams": {
      "KCET": 7,
      "NEET": 5
    }
  }
}
```

**Status Codes:**

- `200 OK` - Success
- `500 Internal Server Error` - Redis error

---

#### `GET /api/stats/exams`

**Description:** Get aggregated statistics for all exam contexts.

**Example Request:**

```bash
GET /api/stats/exams
```

**Response:**

```json
{
  "KCET": {
    "scans": 39,
    "questions": 2340,
    "subjects": {
      "Math": 10,
      "Physics": 12,
      "Chemistry": 10,
      "Biology": 7
    }
  },
  "NEET": {
    "scans": 18,
    "questions": 810,
    "subjects": {
      "Physics": 5,
      "Chemistry": 8,
      "Biology": 5
    }
  },
  "JEE": {
    "scans": 8,
    "questions": 240,
    "subjects": {
      "Math": 5,
      "Physics": 3
    }
  }
}
```

**Status Codes:**

- `200 OK` - Success
- `500 Internal Server Error` - Redis error

---

### 3. Validation

#### `POST /api/validate/combination`

**Description:** Validate if a subject-exam combination is valid.

**Request Body:**

```json
{
  "subject": "Math",
  "examContext": "NEET"
}
```

**Response (Valid):**

```json
{
  "valid": true,
  "subject": "Physics",
  "examContext": "KCET"
}
```

**Response (Invalid):**

```json
{
  "valid": false,
  "subject": "Math",
  "examContext": "NEET",
  "reason": "Math is not available for NEET exam",
  "validExamsForSubject": ["KCET", "JEE", "CBSE"],
  "validSubjectsForExam": ["Physics", "Chemistry", "Biology"]
}
```

**Status Codes:**

- `200 OK` - Validation complete (check `valid` field)
- `400 Bad Request` - Invalid request format

---

## Redis Data Schema

### Scan Storage

**Key Pattern:** `scan:{uuid}`

**Value (JSON):**

```json
{
  "id": "scan-uuid-123",
  "name": "KCET 2024 Physics",
  "date": "2024-01-20",
  "timestamp": 1705766400000,
  "status": "Complete",
  "grade": "Class 12",
  "subject": "Physics",
  "examContext": "KCET",
  "analysisData": {
    "summary": "...",
    "overallDifficulty": "Moderate",
    "difficultyDistribution": [...],
    "bloomsTaxonomy": [...],
    "topicWeightage": [...],
    "questions": [...]
  }
}
```

### Index Storage (Optional Optimization)

For faster querying, maintain secondary indexes:

**Subject Index:**
- Key: `index:subject:{subject}`
- Type: Set
- Value: Scan IDs

**Exam Index:**
- Key: `index:exam:{examContext}`
- Type: Set
- Value: Scan IDs

**Composite Index:**
- Key: `index:subject:{subject}:exam:{examContext}`
- Type: Set
- Value: Scan IDs

**Example:**

```redis
SADD index:subject:Physics scan-uuid-1 scan-uuid-2
SADD index:exam:KCET scan-uuid-1 scan-uuid-3
SADD index:subject:Physics:exam:KCET scan-uuid-1
```

---

## Error Handling

### Standard Error Response

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional details (optional)",
  "timestamp": 1705766400000
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_EXAM_CONTEXT` | 400 | examContext field not provided |
| `INVALID_EXAM_CONTEXT` | 400 | examContext value not in allowed list |
| `INVALID_SUBJECT` | 400 | subject value not in allowed list |
| `INCOMPATIBLE_COMBINATION` | 400 | subject-exam pair not compatible |
| `SCAN_NOT_FOUND` | 404 | Scan ID doesn't exist |
| `REDIS_ERROR` | 500 | Redis connection/operation failed |

---

## Backward Compatibility

### Existing Scans Without examContext

**Migration Behavior:**

Old scans without `examContext` field will be assigned a default:

- Math → KCET
- Physics → KCET
- Chemistry → KCET
- Biology → NEET

**Migration Script:**

Run `node scripts/migrateExamContext.js` to add `examContext` to all existing scans.

**API Behavior:**

- `GET /api/scans` returns old scans with default examContext
- `POST /api/scans` requires examContext for new scans

---

## Rate Limiting

Currently not implemented. Future considerations:

- 100 requests/minute per IP for GET endpoints
- 20 requests/minute per IP for POST endpoints

---

## Authentication

Currently not required. All endpoints are public.

Future: Add JWT-based authentication for multi-user support.

---

## CORS Configuration

**Allowed Origins:**

- `http://localhost:9000` (Vite dev server)
- `http://localhost:9001` (Express server)

**Allowed Methods:**

- GET, POST, PUT, DELETE, OPTIONS

**Allowed Headers:**

- Content-Type, Authorization

---

## Testing Endpoints

### Using curl

```bash
# Get all scans
curl http://localhost:9001/api/scans

# Get Physics scans
curl "http://localhost:9001/api/scans?subject=Physics"

# Create scan
curl -X POST http://localhost:9001/api/scans \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-scan",
    "subject": "Physics",
    "examContext": "KCET",
    "grade": "Class 12",
    "name": "Test Scan"
  }'

# Get stats
curl http://localhost:9001/api/stats/subjects
```

### Using JavaScript (Frontend)

```javascript
// Fetch filtered scans
const response = await fetch('/api/scans?subject=Physics&examContext=KCET');
const scans = await response.json();

// Upload new scan
const newScan = {
  id: generateId(),
  subject: 'Physics',
  examContext: 'KCET',
  grade: 'Class 12',
  name: 'KCET 2024 Physics'
};

const response = await fetch('/api/scans', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newScan)
});

const result = await response.json();
```

---

## WebSocket Support (Future)

For real-time scan processing updates:

```javascript
// Future implementation
const ws = new WebSocket('ws://localhost:9001/ws/scans');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  if (update.type === 'SCAN_PROGRESS') {
    console.log(`Processing: ${update.progress}%`);
  }
};
```

---

## Changelog

### v1.0.0 (2026-01-31)

**Added:**
- `examContext` field to Scan model
- Query filtering by subject and examContext
- Validation endpoint for subject-exam combinations
- Subject and exam statistics endpoints
- Error codes and standardized error responses

**Changed:**
- POST /api/scans now requires examContext field
- GET /api/scans returns scans sorted by timestamp

**Deprecated:**
- None

**Removed:**
- None

---

## References

- [Main Architecture Doc](./MULTI_SUBJECT_ARCHITECTURE.md)
- [Quick Reference Guide](./MULTI_SUBJECT_QUICK_REFERENCE.md)
- [Express.js Documentation](https://expressjs.com/)
- [Redis Documentation](https://redis.io/documentation)

---

**Last Updated:** 2026-01-31
**Version:** 1.0.0
**Maintainer:** Development Team
