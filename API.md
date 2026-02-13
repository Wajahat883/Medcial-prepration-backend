# AMC MCQ Exam Preparation Platform - API Documentation

## Overview

Complete RESTful API for the AMC MCQ Exam Preparation Platform with authentication, question bank management, test sessions, analytics, and bookmarking.

## Base URL

```
Development: http://localhost:5000/api
Production: https://api.yourdomain.com/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

## Response Format

All responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... } // For list endpoints
}
```

**Error Response:**
```json
{
  "success": false,
  "status": "error",
  "error": "Error message"
}
```

## Endpoints Reference

### Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "refreshToken": "a1b2c3d4...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

#### POST /auth/login
Authenticate and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Same as register.

#### POST /auth/refresh
Get a new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4..."
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGc..."
}
```

#### POST /auth/logout
Invalidate the refresh token.

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4..."
}
```

#### POST /auth/forgot-password
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### POST /auth/reset-password/:token
Reset password with token.

**Request Body:**
```json
{
  "password": "newpassword123"
}
```

---

### Users

#### GET /users/profile
Get complete user profile with progress.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "avatar": null,
      "createdAt": "..."
    },
    "progress": {
      "totalQuestionsAttempted": 150,
      "totalCorrectAnswers": 120,
      "accuracy": 80,
      "streakDays": 5
    }
  }
}
```

#### PUT /users/profile
Update user profile.

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "avatar": "https://..."
}
```

#### PUT /users/password
Change password.

**Request Body:**
```json
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass123"
}
```

#### GET /users/statistics
Get detailed user statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTestsTaken": 15,
    "testsPassed": 12,
    "testsFailed": 3,
    "averageScore": 72,
    "highestScore": 88,
    "lowestScore": 45,
    "totalTimeSpent": 54000,
    "favoriteCategory": "Cardiology",
    "weakestCategory": "Neurology"
  }
}
```

---

### Questions

#### GET /questions
List questions with filters and pagination.

**Query Parameters:**
- `category` - Filter by category
- `difficulty` - easy, medium, hard
- `search` - Search in question text
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "questionText": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 1,
      "explanation": "...",
      "category": "Cardiology",
      "difficulty": "medium",
      "tags": ["ECG", "chest pain"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### GET /questions/:id
Get single question details.

#### GET /questions/subjects
Get all subjects (categories) with counts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cardiology",
      "name": "Cardiology",
      "subcategories": ["Acute Coronary Syndrome", "Arrhythmias"],
      "questionCount": 45
    }
  ]
}
```

#### GET /questions/subjects/:id/topics
Get topics (subcategories) for a subject.

**Response:**
```json
{
  "success": true,
  "data": {
    "subject": "Cardiology",
    "topics": [
      {
        "id": "acute-coronary-syndrome",
        "name": "Acute Coronary Syndrome",
        "questionCount": 15
      }
    ]
  }
}
```

#### GET /questions/random
Get random questions for practice.

**Query Parameters:**
- `count` - Number of questions (max: 150)
- `category` - Filter by category

---

### Tests

#### POST /tests
Create a new test session.

**Request Body:**
```json
{
  "questionCount": 50,
  "category": "Cardiology",
  "duration": 18000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "questions": [...],
    "duration": 18000,
    "startTime": "...",
    "status": "in_progress"
  }
}
```

#### GET /tests/:id
Get test session details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "questions": [...],
    "answers": { "0": 1, "1": 2 },
    "startTime": "...",
    "duration": 18000,
    "timeRemaining": 15000,
    "status": "in_progress"
  }
}
```

#### POST /tests/:id/answer
Submit an answer.

**Request Body:**
```json
{
  "questionIndex": 0,
  "answer": 2
}
```

#### POST /tests/:id/complete
Complete the test and get results.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "score": 75,
    "correctAnswers": 38,
    "totalQuestions": 50,
    "timeTaken": 7200,
    "status": "completed"
  }
}
```

#### GET /tests/:id/results
Get detailed test results with explanations.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "score": 75,
    "totalQuestions": 50,
    "correctAnswers": 38,
    "incorrectAnswers": 10,
    "unanswered": 2,
    "timeTaken": 7200,
    "questionResults": [
      {
        "question": { ... },
        "userAnswer": 1,
        "isCorrect": true
      }
    ],
    "categoryBreakdown": [
      {
        "category": "Cardiology",
        "attempted": 20,
        "correct": 15,
        "accuracy": 75
      }
    ]
  }
}
```

#### GET /tests/history
Get test history with pagination.

**Query Parameters:**
- `status` - completed, abandoned
- `page` - Page number
- `limit` - Items per page

---

### Analytics

#### GET /analytics/overview
Get dashboard overview statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalQuestions": 1000,
    "questionsAttempted": 150,
    "completionRate": 15,
    "completedTests": 10,
    "averageScore": 72,
    "accuracy": 80,
    "streakDays": 5,
    "lastStudyDate": "2024-01-15"
  }
}
```

#### GET /analytics/subjects
Get performance by subject.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "category": "Cardiology",
      "attempted": 50,
      "correct": 40,
      "accuracy": 80,
      "totalQuestions": 100,
      "completionRate": 50
    }
  ]
}
```

#### GET /analytics/trends
Get progress trends over time.

**Query Parameters:**
- `days` - Number of days to analyze (default: 30)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "testsCompleted": 2,
      "averageScore": 70
    }
  ]
}
```

#### GET /analytics/predictions
Get score prediction based on recent performance.

**Response:**
```json
{
  "success": true,
  "data": {
    "predictedScore": 78,
    "confidence": 85,
    "trend": "improving",
    "recommendation": "Good progress! Continue studying consistently...",
    "recentAverage": 75,
    "testsAnalyzed": 10
  }
}
```

---

### Bookmarks

#### GET /bookmarks
Get all bookmarks with pagination.

**Query Parameters:**
- `search` - Search in question text
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "question": { ... },
      "notes": "Review this before exam",
      "createdAt": "..."
    }
  ],
  "pagination": { ... }
}
```

#### POST /bookmarks
Add a bookmark.

**Request Body:**
```json
{
  "questionId": "...",
  "notes": "Important question"
}
```

#### PUT /bookmarks/:id
Update bookmark notes.

**Request Body:**
```json
{
  "notes": "Updated notes"
}
```

#### DELETE /bookmarks/:id
Remove a bookmark.

#### GET /bookmarks/check/:questionId
Check if a question is bookmarked.

**Response:**
```json
{
  "success": true,
  "data": {
    "isBookmarked": true,
    "bookmarkId": "..."
  }
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Validation Error - Invalid request format |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Rate Limits

- **General API**: 100 requests per 15 minutes
- **Authentication**: 10 requests per 15 minutes

## Pagination

List endpoints support pagination with these parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

Response includes pagination object:
```json
{
  "page": 1,
  "limit": 20,
  "total": 150,
  "pages": 8
}
```
