import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { TestSession } from '../models/TestSession';
import { UserProgress } from '../models/UserProgress';
import { Question } from '../models/Question';
import { StudentPerformanceDetail } from '../models/StudentPerformanceDetail';
import { QuestionMetadata } from '../models/QuestionMetadata';
import { RecallIntelligence } from '../models/RecallIntelligence';

// @desc    Get dashboard statistics (overview)
// @route   GET /api/analytics/overview
// @access  Private
export const getDashboardStats = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id;

    // Get user progress
    const progress = await UserProgress.findOne({ user: userId });

    // Get test statistics
    const completedTests = await TestSession.countDocuments({
      user: userId,
      status: 'completed',
    });

    const averageScore = await TestSession.aggregate([
      { $match: { user: userId, status: 'completed' } },
      { $group: { _id: null, avgScore: { $avg: '$score' } } },
    ]);

    // Get total questions available
    const totalQuestions = await Question.countDocuments({ isActive: true });

    // Get questions attempted by user
    const questionsAttempted = progress?.totalQuestionsAttempted || 0;

    res.json({
      success: true,
      data: {
        totalQuestions,
        questionsAttempted,
        completionRate: totalQuestions > 0 ? Math.round((questionsAttempted / totalQuestions) * 100) : 0,
        completedTests,
        averageScore: averageScore.length > 0 ? Math.round(averageScore[0].avgScore) : 0,
        accuracy: progress ? Math.round((progress.totalCorrectAnswers / progress.totalQuestionsAttempted) * 100) || 0 : 0,
        streakDays: progress?.streakDays || 0,
        lastStudyDate: progress?.lastStudyDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get performance by category (subjects)
// @route   GET /api/analytics/subjects
// @access  Private
export const getPerformanceByCategory = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id;

    const progress = await UserProgress.findOne({ user: userId });

    if (!progress) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Transform category progress into array
    const categoryPerformance = [];
    for (const [category, data] of progress.categoryProgress.entries()) {
      const totalQuestions = await Question.countDocuments({ category, isActive: true });
      categoryPerformance.push({
        category,
        attempted: data.attempted,
        correct: data.correct,
        accuracy: Math.round((data.correct / data.attempted) * 100) || 0,
        totalQuestions,
        completionRate: Math.round((data.attempted / totalQuestions) * 100) || 0,
      });
    }

    res.json({
      success: true,
      data: categoryPerformance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get study streak
// @route   GET /api/analytics/study-streak
// @access  Private
export const getStudyStreak = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id;

    const progress = await UserProgress.findOne({ user: userId });

    // Get last 7 days activity
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const testsCompleted = await TestSession.countDocuments({
        user: userId,
        status: 'completed',
        endTime: { $gte: date, $lt: nextDate },
      });

      last7Days.push({
        date: date.toISOString().split('T')[0],
        studied: testsCompleted > 0,
        testsCompleted,
      });
    }

    res.json({
      success: true,
      data: {
        currentStreak: progress?.streakDays || 0,
        lastStudyDate: progress?.lastStudyDate,
        last7Days,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get progress over time (trends)
// @route   GET /api/analytics/trends
// @access  Private
export const getProgressOverTime = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const tests = await TestSession.find({
      user: userId,
      status: 'completed',
      createdAt: { $gte: startDate },
    }).sort({ createdAt: 1 });

    // Group by date
    const progressByDate = new Map();
    
    tests.forEach(test => {
      const dateKey = test.createdAt.toISOString().split('T')[0];
      
      if (!progressByDate.has(dateKey)) {
        progressByDate.set(dateKey, {
          date: dateKey,
          testsCompleted: 0,
          averageScore: 0,
          totalScore: 0,
        });
      }
      
      const entry = progressByDate.get(dateKey);
      entry.testsCompleted++;
      entry.totalScore += test.score || 0;
      entry.averageScore = Math.round(entry.totalScore / entry.testsCompleted);
    });

    res.json({
      success: true,
      data: Array.from(progressByDate.values()),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get score prediction
// @route   GET /api/analytics/predictions
// @access  Private
export const getScorePrediction = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id;

    // Get last 10 completed tests for trend analysis
    const recentTests = await TestSession.find({
      user: userId,
      status: 'completed',
    })
      .sort({ createdAt: -1 })
      .limit(10);

    if (recentTests.length < 3) {
      return res.json({
        success: true,
        data: {
          predictedScore: 0,
          confidence: 0,
          trend: 'stable',
          recommendation: 'Complete more tests to get an accurate prediction. We recommend at least 3 tests.',
        },
      });
    }

    // Calculate scores
    const scores = recentTests.map(test => test.score || 0);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Calculate trend using linear regression on recent tests
    const n = scores.length;
    const xMean = (n - 1) / 2;
    const yMean = averageScore;
    
    let numerator = 0;
    let denominator = 0;
    
    scores.forEach((score, index) => {
      const x = index;
      numerator += (x - xMean) * (score - yMean);
      denominator += (x - xMean) ** 2;
    });
    
    const slope = denominator !== 0 ? numerator / denominator : 0;

    // Determine trend
    let trend: 'improving' | 'stable' | 'declining';
    if (slope > 2) {
      trend = 'improving';
    } else if (slope < -2) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    // Calculate confidence based on number of tests and consistency
    const variance = scores.reduce((sum, score) => sum + (score - averageScore) ** 2, 0) / n;
    const standardDeviation = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - standardDeviation);
    const confidence = Math.min(95, Math.round((n / 10) * consistency));

    // Predict next score based on trend
    let predictedScore = Math.round(averageScore + slope);
    
    // Clamp between 0 and 100
    predictedScore = Math.max(0, Math.min(100, predictedScore));

    // Generate recommendation
    let recommendation: string;
    if (predictedScore >= 70) {
      recommendation = 'Excellent progress! You are on track to pass the AMC exam. Keep maintaining your study routine.';
    } else if (predictedScore >= 50) {
      if (trend === 'improving') {
        recommendation = 'Good progress! Continue studying consistently to improve your predicted score above the passing threshold.';
      } else if (trend === 'declining') {
        recommendation = 'Your scores are trending downward. Consider reviewing your study strategy and focusing on weak areas.';
      } else {
        recommendation = 'You are near the passing threshold. Focus on challenging topics to push your score higher.';
      }
    } else {
      if (trend === 'improving') {
        recommendation = 'Your scores are improving, but more work is needed. Focus on building a stronger foundation in core topics.';
      } else {
        recommendation = 'Additional preparation is recommended. Try focusing on specific categories where you struggle most.';
      }
    }

    res.json({
      success: true,
      data: {
        predictedScore,
        confidence,
        trend,
        recommendation,
        recentAverage: Math.round(averageScore),
        testsAnalyzed: n,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Track a user's question attempt (detailed analytics)
// @route   POST /api/analytics/track-attempt
// @access  Private
export const trackAttempt = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id;
    const { questionId, timeTaken, confidenceLevel, isCorrect, sessionId, errorType } = req.body;

    if (!questionId || typeof timeTaken !== 'number') {
      return res.status(400).json({ success: false, error: 'questionId and timeTaken are required' });
    }

    // Save detailed attempt
    await StudentPerformanceDetail.create({
      userId,
      questionId,
      sessionId: sessionId || null,
      timeTaken,
      confidenceLevel: confidenceLevel ?? null,
      errorType: errorType || 'none',
      attemptCount: 1,
      correctedOnRetry: false,
    });

    // Update user progress counters
    const progress = await (UserProgress as any).getOrCreate(userId);
    progress.totalQuestionsAttempted += 1;
    if (isCorrect) progress.totalCorrectAnswers += 1;
    // Update category progress if we can resolve question category
    const question = await Question.findById(questionId);
    if (question && question.category) {
      await progress.updateCategoryProgress(question.category, Boolean(isCorrect));

      // Update recall intelligence for topic
      await QuestionMetadata.findOneAndUpdate({ questionId }, { $inc: { recallFrequency: 1 }, lastReviewedAt: new Date() }, { upsert: true });

      await RecallIntelligence.findOneAndUpdate(
        { topic: question.category },
        { $inc: { recallFrequency: 1, last30DaysCount: 1, last90DaysCount: 1 } },
        { upsert: true },
      );
    }

    // Update streak/lastStudyDate
    try { await progress.updateStreak(); } catch (e) { /* ignore */ }

    res.json({ success: true, message: 'Attempt tracked' });
  } catch (error) {
    next(error);
  }
};

// NEW Phase 1 Endpoints

// Get comprehensive performance metrics
export const getPerformanceMetrics = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id.toString();
    const { PerformanceAnalyticsService } = await import('../services/performance-analytics.service');

    const metrics = await PerformanceAnalyticsService.getPerformanceMetrics(userId);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

// Get cognitive profile
export const getCognitiveProfile = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id.toString();
    const { PerformanceAnalyticsService } = await import('../services/performance-analytics.service');

    const profile = await PerformanceAnalyticsService.getCognitiveProfile(userId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

// Get performance trends
export const getPerformanceTrends = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id.toString();
    const daysBack = parseInt(req.query.daysBack as string) || 30;
    const { PerformanceAnalyticsService } = await import('../services/performance-analytics.service');

    const trends = await PerformanceAnalyticsService.getPerformanceTrends(userId, daysBack);

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    next(error);
  }
};

// Get difficulty-weighted metrics
export const getDifficultyWeightedMetrics = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id.toString();
    const { PerformanceAnalyticsService } = await import('../services/performance-analytics.service');

    const metrics = await PerformanceAnalyticsService.getDifficultyWeightedMetrics(userId);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// PHASE 2 ENDPOINTS
// =============================================================================

/**
 * GET /api/analytics/cognitive-errors
 * Get categorized errors by type and topic for cognitive profiling
 */
export const getCognitiveErrors = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id.toString();
    const daysBack = parseInt(req.query.daysBack as string) || 30;
    const { StudentPerformanceDetail } = await import('../models/StudentPerformanceDetail');
    const { categorizeError } = await import('../utils/scoring');

    const minDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const attempts = await StudentPerformanceDetail.find({
      userId,
      timestamp: { $gte: minDate },
      isCorrect: false,
    })
      .lean();

    // Group errors by type and topic
    const errorsByType: Record<string, number> = {
      'Knowledge Gap': 0,
      'Reasoning Error': 0,
      'Data Interpretation': 0,
      'Time Pressure': 0,
    };

    const errorsByCategory: Record<string, { count: number; types: Record<string, number> }> = {};

    attempts.forEach((attempt: any) => {
      const errorType = categorizeError(attempt);
      errorsByType[errorType]++;

      const category = attempt.category || 'Unknown';
      if (!errorsByCategory[category]) {
        errorsByCategory[category] = { count: 0, types: {} };
      }
      errorsByCategory[category].count++;
      errorsByCategory[category].types[errorType] = (errorsByCategory[category].types[errorType] || 0) + 1;
    });

    // Calculate percentages
    const totalErrors = attempts.length;
    const errorTypePercentages: Record<string, number> = {};
    Object.entries(errorsByType).forEach(([type, count]) => {
      errorTypePercentages[type] = Math.round((count / Math.max(1, totalErrors)) * 10000) / 10000;
    });

    res.json({
      success: true,
      data: {
        totalErrors,
        byType: errorsByType,
        byTypePercentage: errorTypePercentages,
        byCategory: errorsByCategory,
        recommendations: generateErrorRecommendations(errorsByType, errorsByCategory),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/recall-heatmap
 * Get frequency heatmap of topics attempted recently
 */
export const getRecallHeatmap = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id.toString();
    const { AnalyticsAggregationService } = await import('../services/analytics-aggregation.service');

    const hotTopics = await AnalyticsAggregationService.getHotTopics(userId, 15, 30);

    res.json({
      success: true,
      data: {
        hotTopics,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/hot-topics
 * Alias for recall-heatmap, returns same data
 */
export const getHotTopics = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id.toString();
    const limit = parseInt(req.query.limit as string) || 10;
    const daysBack = parseInt(req.query.daysBack as string) || 30;
    const { AnalyticsAggregationService } = await import('../services/analytics-aggregation.service');

    const hotTopics = await AnalyticsAggregationService.getHotTopics(userId, limit, daysBack);

    res.json({
      success: true,
      data: hotTopics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: Generate error recommendations based on error patterns
 */
function generateErrorRecommendations(
  errorsByType: Record<string, number>,
  errorsByCategory: Record<string, { count: number; types: Record<string, number> }>
): string[] {
  const recommendations: string[] = [];

  // Find most common error type
  const [topErrorType, topErrorCount] = Object.entries(errorsByType).sort(([, a], [, b]) => b - a)[0] || ['Unknown', 0];

  if (topErrorType === 'Knowledge Gap') {
    recommendations.push('Focus on mastering key concepts. Review fundamental definitions and principles.');
  } else if (topErrorType === 'Reasoning Error') {
    recommendations.push('Practice logic and reasoning. Work through thinking process step-by-step for complex questions.');
  } else if (topErrorType === 'Data Interpretation') {
    recommendations.push('Strengthen data analysis skills. Practice interpreting charts, graphs, and statistical information.');
  } else if (topErrorType === 'Time Pressure') {
    recommendations.push('Improve speed through targeted practice. Focus on high-confidence questions to save time.');
  }

  // Find category with highest error count
  const [worstCategory] = Object.entries(errorsByCategory).sort(([, a], [, b]) => b.count - a.count)[0] || ['Unknown', { count: 0 }];

  if (worstCategory !== 'Unknown') {
    recommendations.push(`Priority: Improve performance in ${worstCategory} (most errors reported here).`);
  }

  return recommendations;
}