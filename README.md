# AMC MCQ Exam Preparation Platform - Backend API

A comprehensive backend API for the AMC (Australian Medical Council) MCQ Exam Preparation Platform, built with Node.js, Express, TypeScript, and MongoDB.

## Features

- **Authentication & Authorization**
  - JWT-based authentication with refresh tokens
  - Password hashing with bcryptjs
  - Role-based access control (user/admin)
  - Password reset functionality

- **Question Bank Management**
  - CRUD operations for medical questions
  - Categorization by subject and topic
  - Difficulty levels (easy, medium, hard)
  - Full-text search capabilities

- **Test Session Management**
  - Create and manage timed test sessions
  - Answer submission with progress tracking
  - Automatic scoring and results generation
  - Test history and analytics

- **User Progress Tracking**
  - Overall accuracy calculations
  - Category-wise performance metrics
  - Study streak tracking
  - Learning analytics

- **Bookmarking System**
  - Save questions for later review
  - Personal notes for each bookmark
  - Categorized bookmarks

- **Analytics & Insights**
  - Dashboard statistics
  - Subject performance analysis
  - Progress trends over time
  - Score predictions using trend analysis

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **Database**: MongoDB 6.x with Mongoose 8.x
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Security**: helmet, cors, express-rate-limit, express-mongo-sanitize

## Project Structure

```
src/
├── app.ts                    # Express app configuration
├── index.ts                  # Main entry point & exports
├── types/
│   └── index.ts              # TypeScript interfaces & types
├── config/
│   └── database.ts           # MongoDB connection setup
├── models/
│   ├── User.ts               # User model with password hashing
│   ├── Question.ts           # Question model
│   ├── TestSession.ts        # Test session model
│   ├── Bookmark.ts           # Bookmark model
│   ├── UserProgress.ts       # User progress model
│   └── index.ts              # Model exports
├── controllers/
│   ├── auth.controller.ts    # Authentication controllers
│   ├── user.controller.ts    # User profile controllers
│   ├── question.controller.ts # Question controllers
│   ├── test.controller.ts    # Test session controllers
│   ├── analytics.controller.ts # Analytics controllers
│   └── bookmark.controller.ts # Bookmark controllers
├── routes/
│   ├── auth.routes.ts        # Auth routes
│   ├── user.routes.ts        # User routes
│   ├── question.routes.ts    # Question routes
│   ├── test.routes.ts        # Test routes
│   ├── analytics.routes.ts   # Analytics routes
│   └── bookmark.routes.ts    # Bookmark routes
├── middleware/
│   ├── auth.ts               # JWT authentication middleware
│   ├── errorHandler.ts       # Global error handler
│   └── validate.ts           # Request validation middleware
└── utils/
    ├── jwt.ts                # JWT utilities
    ├── helpers.ts            # Helper functions
    └── seed.ts               # Database seeding utility
```

## API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/auth/register | Register new user | Public |
| POST | /api/auth/login | Login user | Public |
| POST | /api/auth/logout | Logout user | Private |
| POST | /api/auth/refresh | Refresh access token | Public |
| GET | /api/auth/me | Get current user | Private |
| POST | /api/auth/forgot-password | Request password reset | Public |
| POST | /api/auth/reset-password/:token | Reset password | Public |

### Users
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/users/profile | Get user profile | Private |
| PUT | /api/users/profile | Update user profile | Private |
| PUT | /api/users/password | Change password | Private |
| GET | /api/users/progress | Get user progress | Private |
| GET | /api/users/statistics | Get user statistics | Private |
| DELETE | /api/users/account | Delete account | Private |

### Questions
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/questions | List questions with filters | Private |
| GET | /api/questions/:id | Get single question | Private |
| GET | /api/questions/subjects | Get all subjects | Private |
| GET | /api/questions/subjects/:id/topics | Get topics for subject | Private |
| GET | /api/questions/random | Get random questions | Private |
| GET | /api/questions/category/:category | Get questions by category | Private |

### Tests
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/tests | Create new test | Private |
| GET | /api/tests/:id | Get test details | Private |
| POST | /api/tests/:id/answer | Submit answer | Private |
| POST | /api/tests/:id/complete | Complete test | Private |
| POST | /api/tests/:id/abandon | Abandon test | Private |
| GET | /api/tests/:id/results | Get test results | Private |
| GET | /api/tests/history | Get test history | Private |

### Analytics
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/analytics/overview | Dashboard stats | Private |
| GET | /api/analytics/subjects | Subject performance | Private |
| GET | /api/analytics/study-streak | Study streak data | Private |
| GET | /api/analytics/trends | Progress trends | Private |
| GET | /api/analytics/predictions | Score prediction | Private |

### Bookmarks
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/bookmarks | Get all bookmarks | Private |
| POST | /api/bookmarks | Add bookmark | Private |
| GET | /api/bookmarks/check/:questionId | Check if bookmarked | Private |
| PUT | /api/bookmarks/:id | Update bookmark notes | Private |
| DELETE | /api/bookmarks/:id | Remove bookmark | Private |

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB 6+ installed and running
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/medical-exam-prep
JWT_SECRET=your-super-secret-key
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

4. Seed the database with sample data:
```bash
npm run seed
```

5. Start the development server:
```bash
npm run dev
```

The server will start at `http://localhost:5000`.

### Default Test Users

After seeding, you can use these accounts:

- **Admin**: `admin@medprep.com` / `admin123`
- **Student**: `student@medprep.com` / `student123`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run seed` | Seed database with sample data |

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: Protection against brute force attacks
- **MongoDB Sanitization**: Protection against NoSQL injection
- **Input Validation**: Request validation with express-validator
- **Password Hashing**: bcryptjs with salt rounds
- **JWT Authentication**: Secure token-based authentication

## Error Handling

The API uses a centralized error handling middleware that returns consistent error responses:

```json
{
  "success": false,
  "status": "error",
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Development

### Adding New Routes

1. Create controller function in `src/controllers/`
2. Create route definitions in `src/routes/`
3. Mount route in `src/app.ts`

### Database Models

Models are defined using Mongoose schemas in `src/models/`. Each model includes:
- TypeScript interfaces
- Schema definitions with validation
- Indexes for performance
- Instance and static methods
- Virtual properties

## License

MIT
