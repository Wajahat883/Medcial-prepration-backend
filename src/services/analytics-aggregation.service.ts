import mongoose from 'mongoose';
import { StudentPerformanceDetail } from '../models/StudentPerformanceDetail';
import { ReadinessScoreHistory } from '../models/ReadinessScoreHistory';
import { RecallIntelligence } from '../models/RecallIntelligence';
import { UserProgress } from '../models/UserProgress';
import { TestSession } from '../models/TestSession';
import { Question } from '../models/Question';
import { IRTService } from './irt.service';

/**
 * Stability Calculator: measures consistency of performance across mock exams
 */
export class StabilityCalculator {
  /**
   * Calculate performance stability from mock exam scores
   * Lower variance = higher stability (more consistent)
   */
  static async calculateStability(userId: string, minExams: number = 3): Promise<{
    stabilityScore: number; // 0-100
    variance: number;
    stdDev: number;
    trend: 'improving' | 'declining' | 'stable';
    data: Array<{ date: Date; score: number }>;
  }> {
    const testSessions = await TestSession.find({
      user: new mongoose.Types.ObjectId(userId),
      status: 'completed',
    })
      .sort({ completedAt: -1 })
      .limit(20)
      .lean();

    const scoreData = testSessions
      .reverse()
      .map((t: any) => ({
        date: t.completedAt,
        score: ((t.correctAnswers || 0) / (t.totalQuestions || 1)) * 100,
      }));

    if (scoreData.length < minExams) {
      return {
        stabilityScore: 50, // Default for insufficient data
        variance: 0,
        stdDev: 0,
        trend: 'stable',
        data: scoreData,
      };
    }

    // Calculate mean
    const mean = scoreData.reduce((sum, d) => sum + d.score, 0) / scoreData.length;

    // Calculate variance
    const variance = scoreData.reduce((sum, d) => sum + (d.score - mean) ** 2, 0) / scoreData.length;
    const stdDev = Math.sqrt(variance);

    // Stability score: lower stdDev = higher stability (100 = perfect consistency, 0 = max variance)
    const maxStdDev = 40; // Assume max realistic stdDev is 40%
    const stabilityScore = Math.max(0, Math.min(100, 100 - (stdDev / maxStdDev) * 100));

    // Determine trend
    const recentScores = scoreData.slice(-5);
    const recentMean = recentScores.reduce((sum, d) => sum + d.score, 0) / recentScores.length;
    const olderScores = scoreData.slice(0, -5).length > 0 ? scoreData.slice(0, -5) : scoreData;
    const olderMean = olderScores.reduce((sum, d) => sum + d.score, 0) / olderScores.length;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentMean > olderMean + 2) trend = 'improving';
    if (recentMean < olderMean - 2) trend = 'declining';

    return {
      stabilityScore: Math.round(stabilityScore * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      trend,
      data: scoreData,
    };
  }
}

/**
 * Coverage Calculator: measures breadth of topic coverage
 */
export class CoverageCalculator {
  /**
   * Calculate topic coverage percentage
   */
  static async calculateCoverage(
    userId: string,
    minQuestionsPerTopic: number = 5
  ): Promise<{
    overallCoverage: number; // 0-100
    byCategory: Record<string, { attempted: number; coverage: number }>;
    uncoveredCategories: string[];
    topCovered: Array<{ category: string; coverage: number }>;
  }> {
    const attempts = await StudentPerformanceDetail.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    if (attempts.length === 0) {
      return {
        overallCoverage: 0,
        byCategory: {},
        uncoveredCategories: [],
        topCovered: [],
      };
    }

    // Get all categories
    const allCategories = (await Question.distinct('category')).filter((c) => c);

    // Count attempts by category
    const categoryAttempts: Record<string, number> = {};
    attempts.forEach((attempt: any) => {
      categoryAttempts[attempt.category] = (categoryAttempts[attempt.category] || 0) + 1;
    });

    // Calculate coverage
    const byCategory: Record<string, { attempted: number; coverage: number }> = {};
    let totalCovered = 0;

    for (const category of allCategories) {
      const attempted = categoryAttempts[category] || 0;
      const coverage = Math.min(100, (attempted / minQuestionsPerTopic) * 100);
      byCategory[category] = { attempted, coverage };

      if (coverage === 100) totalCovered += 1;
    }

    const overallCoverage = (totalCovered / allCategories.length) * 100;
    const uncoveredCategories = allCategories.filter(
      (c) => !categoryAttempts[c] || categoryAttempts[c] < minQuestionsPerTopic
    );

    const topCovered = Object.entries(byCategory)
      .sort(([, a], [, b]) => b.coverage - a.coverage)
      .slice(0, 5)
      .map(([category, data]) => ({
        category,
        coverage: Math.round(data.coverage),
      }));

    return {
      overallCoverage: Math.round(overallCoverage * 100) / 100,
      byCategory,
      uncoveredCategories,
      topCovered,
    };
  }
}

/**
 * Analytics Aggregation Job: runs periodically to cache metrics for performance
 */
export class AnalyticsAggregationService {
  /**
   * Aggregate daily performance metrics for a user
   */
  static async aggregateDailyMetrics(userId: string): Promise<{
    date: string;
    totalAttempts: number;
    correctAnswers: number;
    accuracy: number;
    avgTimePerQuestionMs: number;
    categoriesAttempted: number;
    newCategoriesExplored: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttempts = await StudentPerformanceDetail.find({
      userId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: today, $lt: tomorrow },
    }).lean();

    if (todayAttempts.length === 0) {
      return {
        date: today.toISOString().split('T')[0],
        totalAttempts: 0,
        correctAnswers: 0,
        accuracy: 0,
        avgTimePerQuestionMs: 0,
        categoriesAttempted: 0,
        newCategoriesExplored: 0,
      };
    }

    const correctAnswers = todayAttempts.filter((a: any) => a.isCorrect).length;
    const totalTime = todayAttempts.reduce((sum: number, a: any) => sum + (a.timeTaken || 0), 0);
    const uniqueCategories = new Set(todayAttempts.map((a: any) => a.category)).size;

    // Get yesterday's categories to calculate new exploration
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayAttempts = await StudentPerformanceDetail.find({
      userId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: yesterday, $lt: today },
    })
      .select('category')
      .lean();

    const yesterdayCategories = new Set(yesterdayAttempts.map((a: any) => a.category));
    const todayCategories = new Set(todayAttempts.map((a: any) => a.category));
    const newCategories = new Set([...todayCategories].filter((c) => !yesterdayCategories.has(c)));

    return {
      date: today.toISOString().split('T')[0],
      totalAttempts: todayAttempts.length,
      correctAnswers,
      accuracy: Math.round((correctAnswers / todayAttempts.length) * 10000) / 10000,
      avgTimePerQuestionMs: todayAttempts.length > 0 ? Math.round(totalTime / todayAttempts.length) : 0,
      categoriesAttempted: uniqueCategories,
      newCategoriesExplored: newCategories.size,
    };
  }

  /**
   * Update recall heatmap for topic frequency tracking
   */
  static async updateRecallHeatmap(userId: string, period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<void> {
    const minDate = this.getMinDate(period);

    const recentAttempts = await StudentPerformanceDetail.find({
      userId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: minDate },
    }).lean();

    // Count frequency by topic/category
    const topicFrequency: Record<string, number> = {};
    recentAttempts.forEach((attempt: any) => {
      const topic = attempt.category;
      topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
    });

    // Update recall intelligence records
    for (const [topic, frequency] of Object.entries(topicFrequency)) {
      await RecallIntelligence.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId), topic },
        {
          userId: new mongoose.Types.ObjectId(userId),
          topic,
          frequency,
          lastSeen: new Date(),
          period,
        },
        { upsert: true }
      );
    }
  }

  /**
   * Identify "hot topics" - frequently recalled in recent attempts
   */
  static async getHotTopics(
    userId: string,
    limit: number = 10,
    daysBack: number = 30
  ): Promise<
    Array<{
      topic: string;
      frequency: number;
      successRate: number;
      lastSeen: Date;
    }>
  > {
    const minDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const heatmap = await RecallIntelligence.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ frequency: -1 })
      .limit(limit)
      .lean();

    const enrichedTopics = await Promise.all(
      heatmap.map(async (h: any) => {
        const attempts = await StudentPerformanceDetail.find({
          userId: new mongoose.Types.ObjectId(userId),
          category: h.topic,
          timestamp: { $gte: minDate },
        }).lean();

        const correctCount = attempts.filter((a: any) => a.isCorrect).length;
        const successRate = attempts.length > 0 ? (correctCount / attempts.length) * 100 : 0;

        return {
          topic: h.topic,
          frequency: h.frequency,
          successRate: Math.round(successRate * 100) / 100,
          lastSeen: h.lastSeen,
        };
      })
    );

    return enrichedTopics;
  }

  /**
   * Run full daily aggregation for a user
   */
  static async runDailyAggregation(userId: string): Promise<void> {
    try {
      console.log(`[AnalyticsAggregation] Running aggregation for user ${userId}`);

      // Update daily metrics
      await this.aggregateDailyMetrics(userId);

      // Update recall heatmap
      await this.updateRecallHeatmap(userId, 'daily');

      // Update user progress
      const performance = await this.getPerformanceSummary(userId);
      await UserProgress.findOneAndUpdate(
        { user: new mongoose.Types.ObjectId(userId) },
        {
          lastAggregatedAt: new Date(),
          dailyMetrics: performance,
        },
        { upsert: true }
      );

      console.log(`[AnalyticsAggregation] Completed for user ${userId}`);
    } catch (error) {
      console.error(`[AnalyticsAggregation] Error for user ${userId}:`, error);
    }
  }

  /**
   * Get performance summary for caching
   */
  private static async getPerformanceSummary(userId: string): Promise<any> {
    const attempts = await StudentPerformanceDetail.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    const correctCount = attempts.filter((a: any) => a.isCorrect).length;

    return {
      totalAttempts: attempts.length,
      correctAnswers: correctCount,
      accuracy: attempts.length > 0 ? (correctCount / attempts.length) * 100 : 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Bulk aggregation for all active users
   */
  static async runBulkAggregation(): Promise<{ processed: number; failed: number }> {
    try {
      const activeUsers = await UserProgress.find().select('user').lean();

      let processed = 0;
      let failed = 0;

      for (const rec of activeUsers) {
        try {
          await this.runDailyAggregation(rec.user.toString());
          processed++;
        } catch (error) {
          console.error(`Failed to aggregate for user ${rec.user}:`, error);
          failed++;
        }
      }

      console.log(`[AnalyticsAggregation] Bulk run: ${processed} processed, ${failed} failed`);
      return { processed, failed };
    } catch (error) {
      console.error('[AnalyticsAggregation] Bulk aggregation failed:', error);
      return { processed: 0, failed: -1 };
    }
  }

  private static getMinDate(period: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.setDate(now.getDate() - 1));
      case 'weekly':
        return new Date(now.setDate(now.getDate() - 7));
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() - 1));
    }
  }
}
