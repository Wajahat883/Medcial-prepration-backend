import mongoose from 'mongoose';
import { StudentPerformanceDetail } from '../models/StudentPerformanceDetail';
import { UserProgress } from '../models/UserProgress';
import { TestSession } from '../models/TestSession';
import { Question } from '../models/Question';
import { UserCognitiveProfile } from '../models/UserCognitiveProfile';

export interface IPerformanceMetrics {
  totalQuestionsAttempted: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  avgTimePerQuestion: number;
  totalTimeSpenMinutes: number;
  attemptsByCategory: Record<string, { total: number; correct: number; accuracy: number }>;
  difficultyDistribution: Record<string, number>;
  recentTrend: number[]; // Last 5 attempts accuracy
}

export interface ICognitiveProfile {
  userId: string;
  errorPatterns: {
    knowledgeGap: number;
    reasoningError: number;
    dataInterpretation: number;
    timePressure: number;
  };
  strengthAreas: string[];
  weaknessAreas: string[];
  suggestedFocus: string[];
  confidenceCalibration: {
    overconfident: number; // % of wrong answers where user was confident
    underconfident: number; // % of correct answers where user was less confident
  };
}

export class PerformanceAnalyticsService {
  /**
   * Track individual question attempt
   */
  static async trackAttempt(
    userId: string,
    questionId: string,
    selectedAnswer: number,
    timeTaken: number,
    isCorrect: boolean,
    sessionId?: string
  ) {
    const question = await Question.findById(questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    const detail = await StudentPerformanceDetail.create({
      userId: new mongoose.Types.ObjectId(userId),
      questionId: new mongoose.Types.ObjectId(questionId),
      sessionId: sessionId ? new mongoose.Types.ObjectId(sessionId) : null,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      timeTaken,
      difficulty: question.difficulty || 'medium',
      category: question.category,
      tags: question.tags || [],
      timestamp: new Date(),
    });

    // Update user progress
    await this.updateUserProgress(userId);

    // Update cognitive profile (async, non-blocking)
    this.analyzeErrorPattern(userId, questionId, isCorrect, selectedAnswer, question.correctAnswer).catch(
      (err) => console.error('Error analyzing pattern:', err)
    );

    return detail;
  }

  /**
   * Get comprehensive performance metrics
   */
  static async getPerformanceMetrics(
    userId: string,
    filterOptions?: {
      category?: string;
      minDate?: Date;
      maxDate?: Date;
      limit?: number;
    }
  ): Promise<IPerformanceMetrics> {
    const query: any = { userId: new mongoose.Types.ObjectId(userId) };

    if (filterOptions?.category) {
      query.category = filterOptions.category;
    }

    if (filterOptions?.minDate || filterOptions?.maxDate) {
      query.timestamp = {};
      if (filterOptions.minDate) query.timestamp.$gte = filterOptions.minDate;
      if (filterOptions.maxDate) query.timestamp.$lte = filterOptions.maxDate;
    }

    const details = await StudentPerformanceDetail.find(query)
      .sort({ timestamp: -1 })
      .limit(filterOptions?.limit || 10000)
      .lean();

    if (details.length === 0) {
      return {
        totalQuestionsAttempted: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        accuracy: 0,
        avgTimePerQuestion: 0,
        totalTimeSpenMinutes: 0,
        attemptsByCategory: {},
        difficultyDistribution: {},
        recentTrend: [],
      };
    }

    // Calculate metrics
    const correctAnswers = details.filter((d: any) => d.isCorrect).length;
    const wrongAnswers = details.length - correctAnswers;
    const accuracy = (correctAnswers / details.length) * 100;
    const totalTimeMs = details.reduce((sum: number, d: any) => sum + (d.timeTaken || 0), 0);
    const avgTimePerQuestion = details.length > 0 ? totalTimeMs / details.length : 0;

    // Attempts by category
    const attemptsByCategory: Record<string, any> = {};
    details.forEach((detail: any) => {
      if (!attemptsByCategory[detail.category]) {
        attemptsByCategory[detail.category] = { total: 0, correct: 0, accuracy: 0 };
      }
      attemptsByCategory[detail.category].total += 1;
      if (detail.isCorrect) attemptsByCategory[detail.category].correct += 1;
    });

    // Calculate accuracy per category
    Object.keys(attemptsByCategory).forEach((cat) => {
      attemptsByCategory[cat].accuracy =
        (attemptsByCategory[cat].correct / attemptsByCategory[cat].total) * 100;
    });

    // Difficulty distribution
    const difficultyDistribution: Record<string, number> = {
      easy: 0,
      medium: 0,
      hard: 0,
    };
    details.forEach((detail: any) => {
      const diff = detail.difficulty || 'medium';
      difficultyDistribution[diff] = (difficultyDistribution[diff] || 0) + 1;
    });

    // Recent trend (last 5 attempts)
    const recentTrend = details
      .slice(0, 5)
      .reverse()
      .map((d: any) => (d.isCorrect ? 1 : 0));

    return {
      totalQuestionsAttempted: details.length,
      correctAnswers,
      wrongAnswers,
      accuracy: Math.round(accuracy * 100) / 100,
      avgTimePerQuestion: Math.round(avgTimePerQuestion),
      totalTimeSpenMinutes: Math.round(totalTimeMs / 60000),
      attemptsByCategory,
      difficultyDistribution,
      recentTrend,
    };
  }

  /**
   * Get cognitive profile with error pattern analysis
   */
  static async getCognitiveProfile(userId: string): Promise<ICognitiveProfile> {
    const profile = await UserCognitiveProfile.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!profile) {
      return {
        userId,
        errorPatterns: {
          knowledgeGap: 0,
          reasoningError: 0,
          dataInterpretation: 0,
          timePressure: 0,
        },
        strengthAreas: [],
        weaknessAreas: [],
        suggestedFocus: [],
        confidenceCalibration: {
          overconfident: 0,
          underconfident: 0,
        },
      };
    }

    return profile.toObject() as unknown as ICognitiveProfile;
  }

  /**
   * Analyze error pattern for cognitive categorization
   */
  private static async analyzeErrorPattern(
    userId: string,
    questionId: string,
    isCorrect: boolean,
    selectedAnswer: number,
    correctAnswer: number
  ) {
    if (isCorrect) return; // Skip correct answers

    const question = await Question.findById(questionId);
    if (!question) return;

    let errorType: 'knowledgeGap' | 'reasoningError' | 'dataInterpretation' | 'timePressure' =
      'knowledgeGap';

    // Simple rule-based categorization (can be enhanced with ML)
    if (question.tags?.includes('next-step') || question.tags?.includes('priority')) {
      errorType = 'reasoningError';
    } else if (
      question.tags?.includes('elderly') ||
      question.tags?.includes('pediatric') ||
      question.tags?.includes('lab-interpretation')
    ) {
      errorType = 'dataInterpretation';
    }

    // Update cognitive profile
    const profile = await UserCognitiveProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $inc: {
          [`errorPatterns.${errorType}`]: 1,
        },
        $addToSet: {
          weaknessAreas: question.category,
        },
      },
      { upsert: true, new: true }
    );

    return profile;
  }

  /**
   * Update user progress aggregate
   */
  private static async updateUserProgress(userId: string) {
    const details = await StudentPerformanceDetail.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    if (details.length === 0) return;

    const categoryProgress: Record<string, any> = {};
    details.forEach((detail: any) => {
      if (!categoryProgress[detail.category]) {
        categoryProgress[detail.category] = { total: 0, correct: 0 };
      }
      categoryProgress[detail.category].total += 1;
      if (detail.isCorrect) categoryProgress[detail.category].correct += 1;
    });

    const correctAnswers = details.filter((d: any) => d.isCorrect).length;

    await UserProgress.findOneAndUpdate(
      { user: new mongoose.Types.ObjectId(userId) },
      {
        totalQuestionsAttempted: details.length,
        totalCorrectAnswers: correctAnswers,
        categoryProgress,
        lastUpdated: new Date(),
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Get performance trends (for readiness calculation)
   */
  static async getPerformanceTrends(userId: string, daysBack: number = 30) {
    const minDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const dailyMetrics = await StudentPerformanceDetail.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: minDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
          total: { $sum: 1 },
          correct: {
            $sum: { $cond: ['$isCorrect', 1, 0] },
          },
          avgTime: { $avg: '$timeTaken' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return dailyMetrics.map((metric: any) => ({
      date: metric._id,
      totalAttempts: metric.total,
      correctAnswers: metric.correct,
      accuracy: (metric.correct / metric.total) * 100,
      avgTimeMs: Math.round(metric.avgTime),
    }));
  }

  /**
   * Compare difficulty-weighted accuracy
   */
  static async getDifficultyWeightedMetrics(userId: string) {
    const details = await StudentPerformanceDetail.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    if (details.length === 0) {
      return { easy: 0, medium: 0, hard: 0, weighted: 0 };
    }

    const byDifficulty = {
      easy: { total: 0, correct: 0 },
      medium: { total: 0, correct: 0 },
      hard: { total: 0, correct: 0 },
    };

    details.forEach((detail: any) => {
      const diff = detail.difficulty || 'medium';
      if (byDifficulty[diff as keyof typeof byDifficulty]) {
        byDifficulty[diff as keyof typeof byDifficulty].total += 1;
        if (detail.isCorrect) {
          byDifficulty[diff as keyof typeof byDifficulty].correct += 1;
        }
      }
    });

    // Calculate accuracy for each difficulty
    const accuracies = {
      easy: byDifficulty.easy.total > 0 ? (byDifficulty.easy.correct / byDifficulty.easy.total) * 100 : 0,
      medium:
        byDifficulty.medium.total > 0 ? (byDifficulty.medium.correct / byDifficulty.medium.total) * 100 : 0,
      hard: byDifficulty.hard.total > 0 ? (byDifficulty.hard.correct / byDifficulty.hard.total) * 100 : 0,
    };

    // Weighted accuracy (higher weight for harder questions)
    const weights = { easy: 1, medium: 1.5, hard: 2 };
    const totalWeight = Object.keys(weights).reduce((sum, key) => {
      const count = byDifficulty[key as keyof typeof byDifficulty].total;
      return sum + (count > 0 ? weights[key as keyof typeof weights] : 0);
    }, 0);

    const weighted =
      totalWeight > 0
        ? (accuracies.easy * 1 * (byDifficulty.easy.total > 0 ? 1 : 0) +
            accuracies.medium * 1.5 * (byDifficulty.medium.total > 0 ? 1 : 0) +
            accuracies.hard * 2 * (byDifficulty.hard.total > 0 ? 1 : 0)) /
          totalWeight
        : 0;

    return {
      easy: Math.round(accuracies.easy * 100) / 100,
      medium: Math.round(accuracies.medium * 100) / 100,
      hard: Math.round(accuracies.hard * 100) / 100,
      weighted: Math.round(weighted * 100) / 100,
    };
  }
}
