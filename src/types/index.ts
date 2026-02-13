import { Request } from "express";
import { Types } from "mongoose";

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "user" | "admin";
  avatar?: string;
  isActive: boolean;
  onboardingComplete: boolean;
  onboardingCompletedAt?: Date;
  selectedCountry?: string;
  selectedUniversity?: string;
  selectedExam?: string;
  selectedPlan?: "free" | "monthly" | "quarterly" | "yearly";
  premiumPackage?: "premium-basic" | "premium-standard" | "premium-ultimate";
  premiumPastPapers?: number | string;
  premiumAccessDays?: number;
  premiumDailyHours?: number;
  premiumStartDate?: Date;
  premiumEndDate?: Date;
  premiumPrice?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuestion {
  _id: Types.ObjectId;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
  subcategory?: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITestSession {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  questions: Types.ObjectId[];
  answers: Map<string, number>;
  startTime: Date;
  endTime?: Date;
  duration: number;
  status: "in_progress" | "completed" | "abandoned";
  score?: number;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBookmark {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  question: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserProgress {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  totalQuestionsAttempted: number;
  totalCorrectAnswers: number;
  categoryProgress: Map<
    string,
    {
      attempted: number;
      correct: number;
    }
  >;
  streakDays: number;
  lastStudyDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface DashboardStats {
  totalQuestions: number;
  questionsAttempted: number;
  completionRate: number;
  completedTests: number;
  averageScore: number;
  accuracy: number;
  streakDays: number;
  lastStudyDate?: Date;
}

export interface CategoryPerformance {
  category: string;
  attempted: number;
  correct: number;
  accuracy: number;
  totalQuestions: number;
  completionRate: number;
}

export interface StudyStreakData {
  currentStreak: number;
  lastStudyDate?: Date;
  last7Days: {
    date: string;
    studied: boolean;
    testsCompleted: number;
  }[];
}

export interface ProgressTrend {
  date: string;
  testsCompleted: number;
  averageScore: number;
}

export interface ScorePrediction {
  predictedScore: number;
  confidence: number;
  trend: "improving" | "stable" | "declining";
  recommendation: string;
}

export interface TestResultDetail {
  question: IQuestion;
  userAnswer?: number;
  correctAnswer: number;
  isCorrect: boolean;
}

export interface UserStatistics {
  totalTestsTaken: number;
  testsPassed: number;
  testsFailed: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalTimeSpent: number;
  favoriteCategory?: string;
  weakestCategory?: string;
}
