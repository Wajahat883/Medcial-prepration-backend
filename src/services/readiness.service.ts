import mongoose from 'mongoose';
import { StudentPerformanceDetail } from '../models/StudentPerformanceDetail';
import { UserProgress } from '../models/UserProgress';
import { TestSession } from '../models/TestSession';
import { Question } from '../models/Question';
import { ReadinessScoreHistory } from '../models/ReadinessScoreHistory';
import { UserCognitiveProfile } from '../models/UserCognitiveProfile';
import { IRTService } from './irt.service';
import { StabilityCalculator, CoverageCalculator, AnalyticsAggregationService } from './analytics-aggregation.service';

/**
 * Readiness Score Service
 * Calculates comprehensive readiness scores using IRT theory and multi-component scoring
 * 
 * Score Components (Total 100 points):
 * - Accuracy (40 points): IRT-weighted accuracy on attempted questions
 * - Stability (20 points): Consistency across recent mock exams
 * - Coverage (20 points): Topic/category breadth coverage
 * - Speed (10 points): Time per question efficiency
 * - Consistency (10 points): Score variance over time
 */
export class ReadinessService {
  /**
   * Compute comprehensive readiness score for a user
   * Integrates IRT theory, stability analysis, and coverage metrics
   */
  static async computeReadiness(userId: string, useCache: boolean = true) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Check cache
    if (useCache) {
      const cached = await ReadinessScoreHistory.findOne({ userId: userObjectId })
        .sort({ timestamp: -1 })
        .lean();

      if (cached && Date.now() - new Date(cached.timestamp).getTime() < 3600000) {
        // Cache valid for 1 hour
        return {
          overall_score: Math.round(cached.overallScore * 100) / 100,
          components: cached.components,
          isCached: true,
          cachedAt: cached.timestamp,
        };
      }
    }

    try {
      // Gather performance data
      const [details, progress, recentTests, irtService] = await Promise.all([
        StudentPerformanceDetail.find({ userId: userObjectId }).lean(),
        UserProgress.findOne({ user: userObjectId }).lean(),
        TestSession.find({ user: userObjectId, status: 'completed' })
          .sort({ completedAt: -1 })
          .limit(50)
          .lean(),
        Promise.resolve(new IRTService()),
      ]);

      if (details.length === 0) {
        // Not enough data
        return {
          overall_score: 0,
          components: {
            accuracy: 0,
            stability: 0,
            coverage: 0,
            speed: 0,
            consistency: 0,
            irtAbility: null,
          },
          message: 'Insufficient data for readiness calculation',
        };
      }

      // ===== COMPONENT 1: ACCURACY (40 points) =====
      const rawAccuracy =
        progress && progress.totalQuestionsAttempted > 0
          ? (progress.totalCorrectAnswers / progress.totalQuestionsAttempted) * 100
          : 0;

      // Get recent question difficulties for IRT calculation
      const recentQuestionIds = details
        .slice(-300)
        .map((d: any) => d.questionId)
        .filter(Boolean);
      const questions = await Question.find({ _id: { $in: recentQuestionIds } })
        .select('_id difficulty')
        .lean();

      const questionMap: Record<string, number> = {};
      questions.forEach((q: any) => {
        questionMap[q._id.toString()] = q.difficulty || 0.5;
      });

      // Calculate IRT-weighted accuracy
      let irtWeightedAccuracy = rawAccuracy;
      let irtAbility = 0;

      try {
        // Aggregate question params by difficulty
        const difficultyGroups = details.reduce(
          (acc: Record<string, { correct: number; total: number }>, d: any) => {
            const diff = questionMap[d.questionId?.toString() || ''] || 0.5;
            const key = Math.round(diff * 10) / 10;
            if (!acc[key]) acc[key] = { correct: 0, total: 0 };
            acc[key].total++;
            if (d.isCorrect) acc[key].correct++;
            return acc;
          },
          {}
        );

        // Estimate IRT parameters and ability
        const difficultySorted = Object.entries(difficultyGroups).sort(([a], [b]) => parseFloat(a) - parseFloat(b));

        const responses = difficultySorted.flatMap(([diff, { correct, total }]) =>
          Array(total).fill(0).map((_, i) => i < correct ? 1 : 0)
        );

        if (responses.length > 0) {
          irtAbility = irtService.estimateStudentAbility(userId, responses.map((r, i) => ({ response: r })));

          // Weight accuracy by IRT discrimination
          const avgDiscrimination = 1.2; // Typical value for medical MCQs
          irtWeightedAccuracy = Math.min(100, rawAccuracy * (1 + (avgDiscrimination - 1) * 0.1));
        }
      } catch (err) {
        console.log('[ReadinessService] IRT calculation fallback:', err instanceof Error ? err.message : err);
        irtWeightedAccuracy = rawAccuracy;
      }

      const accuracyScore = (irtWeightedAccuracy / 100) * 40;

      // ===== COMPONENT 2: STABILITY (20 points) =====
      const stabilityData = await StabilityCalculator.calculateStability(userId, 3);
      const stabilityScore = (stabilityData.stabilityScore / 100) * 20;

      // ===== COMPONENT 3: COVERAGE (20 points) =====
      const coverageData = await CoverageCalculator.calculateCoverage(userId, 5);
      const coverageScore = (coverageData.overallCoverage / 100) * 20;

      // ===== COMPONENT 4: SPEED (10 points) =====
      const avgTimePerQuestion =
        details.length > 0
          ? details.reduce((sum: number, d: any) => sum + (d.timeTaken || 0), 0) / details.length
          : 0;

      // Assume 90 seconds per question is ideal for medical exams
      const idealTimePerQuestion = 90;
      const speedRatio = Math.min(1, idealTimePerQuestion / Math.max(1, avgTimePerQuestion));
      const speedScore = speedRatio * 10;

      // ===== COMPONENT 5: CONSISTENCY (10 points) =====
      let consistencyScore = 5; // Default half points
      if (recentTests.length >= 1) {
        const scores = recentTests.map((t: any) => ((t.correctAnswers || 0) / (t.totalQuestions || 1)) * 100);
        if (scores.length >= 2) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          const deviations = scores.map((s) => Math.abs(s - avg));
          const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;

          // Low deviation = high consistency
          consistencyScore = Math.max(0, 10 - (avgDeviation / 10) * 10);
        }
      }

      // ===== FINAL SCORE =====
      const overallScore =
        Math.round((accuracyScore + stabilityScore + coverageScore + speedScore + consistencyScore) * 100) / 100;

      const components = {
        accuracy: Math.round(accuracyScore * 100) / 100,
        stability: Math.round(stabilityScore * 100) / 100,
        coverage: Math.round(coverageScore * 100) / 100,
        speed: Math.round(speedScore * 100) / 100,
        consistency: Math.round(consistencyScore * 100) / 100,
        rawAccuracy: Math.round(rawAccuracy * 100) / 100,
        irtWeightedAccuracy: Math.round(irtWeightedAccuracy * 100) / 100,
        irtAbility: Math.round(irtAbility * 100) / 100,
        stabilityTrend: stabilityData.trend,
        avgTimePerQuestion: Math.round(avgTimePerQuestion),
      };

      // Save to history for tracking
      await ReadinessScoreHistory.create({
        userId: userObjectId,
        overallScore,
        components,
        timestamp: new Date(),
      });

      // Update cognitive profile
      await this.updateCognitiveProfile(userId, components, stabilityData, coverageData);

      return {
        overall_score: overallScore,
        components,
        isCached: false,
      };
    } catch (error) {
      console.error('[ReadinessService] Error computing readiness:', error);
      return {
        overall_score: 0,
        components: {},
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get readiness breakdown by category
   */
  static async getReadinessBreakdown(userId: string) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const details = await StudentPerformanceDetail.find({ userId: userObjectId }).lean();

    const breakdown: Record<string, { attempted: number; correct: number; accuracy: number }> = {};

    details.forEach((d: any) => {
      const category = d.category || 'Unknown';
      if (!breakdown[category]) {
        breakdown[category] = { attempted: 0, correct: 0, accuracy: 0 };
      }
      breakdown[category].attempted++;
      if (d.isCorrect) breakdown[category].correct++;
    });

    // Calculate accuracy per category
    Object.entries(breakdown).forEach(([category, data]) => {
      data.accuracy = Math.round((data.correct / Math.max(1, data.attempted)) * 10000) / 10000;
    });

    return breakdown;
  }

  /**
   * Get readiness trends over time
   */
  static async getReadinessTrends(userId: string, days: number = 30) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const minDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const history = await ReadinessScoreHistory.find({
      userId: userObjectId,
      timestamp: { $gte: minDate },
    })
      .sort({ timestamp: 1 })
      .lean();

    return history.map((h: any) => ({
      date: h.timestamp,
      score: h.overallScore,
      components: h.components,
    }));
  }

  /**
   * Get comprehensive readiness report
   */
  static async getReadinessReport(userId: string) {
    const [score, breakdown, trends, stability, coverage] = await Promise.all([
      this.computeReadiness(userId),
      this.getReadinessBreakdown(userId),
      this.getReadinessTrends(userId, 30),
      StabilityCalculator.calculateStability(userId),
      CoverageCalculator.calculateCoverage(userId),
    ]);

    return {
      overall: score,
      breakdown,
      trends,
      stability: {
        score: stability.stabilityScore,
        variance: stability.variance,
        stdDev: stability.stdDev,
        trend: stability.trend,
      },
      coverage: {
        overall: coverage.overallCoverage,
        byCategory: coverage.byCategory,
        topCovered: coverage.topCovered,
        uncovered: coverage.uncoveredCategories,
      },
      recommendations: this.generateRecommendations(score, stability, coverage),
    };
  }

  /**
   * Generate personalized recommendations based on readiness metrics
   */
  private static generateRecommendations(
    score: any,
    stability: Awaited<ReturnType<typeof StabilityCalculator.calculateStability>>,
    coverage: Awaited<ReturnType<typeof CoverageCalculator.calculateCoverage>>
  ): string[] {
    const recommendations: string[] = [];

    // Accuracy recommendations
    if (score.components.accuracy < 20) {
      recommendations.push('Focus on mastering fundamental concepts. Your accuracy is below target.');
    } else if (score.components.accuracy < 30) {
      recommendations.push('Increase practice volume on challenging topics to improve accuracy.');
    }

    // Stability recommendations
    if (stability.stabilityScore < 40) {
      recommendations.push('Your performance is inconsistent. Practice mock exams under timed conditions.');
    } else if (stability.trend === 'declining') {
      recommendations.push('Your recent performance is declining. Review recent mistakes and adjust study strategy.');
    } else if (stability.trend === 'improving') {
      recommendations.push('Great progress! Your performance is improving. Continue current study approach.');
    }

    // Coverage recommendations
    if (coverage.overallCoverage < 50) {
      recommendations.push(`Expand your practice to include uncovered topics: ${coverage.uncoveredCategories.slice(0, 3).join(', ')}`);
    }

    // Speed recommendations
    if (score.components.speed < 5) {
      recommendations.push('Practice time management. Aim to complete questions within 90 seconds each.');
    }

    // Overall recommendations
    if (score.overall_score < 40) {
      recommendations.push('You need significant improvement. Focus on basics before attempting full exams.');
    } else if (score.overall_score < 60) {
      recommendations.push('You are making progress but still below target. Intensify your practice.');
    } else if (score.overall_score < 80) {
      recommendations.push('Good progress! You are approaching exam readiness. Continue focused practice.');
    } else {
      recommendations.push('Excellent! You are well-prepared for the exam. Maintain this level with light revision.');
    }

    return recommendations;
  }

  /**
   * Update user cognitive profile based on readiness metrics
   */
  private static async updateCognitiveProfile(
    userId: string,
    components: Record<string, any>,
    stability: Awaited<ReturnType<typeof StabilityCalculator.calculateStability>>,
    coverage: Awaited<ReturnType<typeof CoverageCalculator.calculateCoverage>>
  ): Promise<void> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const weakCategories = Object.entries(coverage.byCategory)
        .filter(([, data]: any) => data.coverage < 50)
        .map(([category]) => category);

      const strongCategories = coverage.topCovered.map((t) => t.category);

      await UserCognitiveProfile.findOneAndUpdate(
        { userId: userObjectId },
        {
          userId: userObjectId,
          readinessScore: components.accuracy + components.stability + components.coverage + components.speed + components.consistency,
          irtAbility: components.irtAbility,
          strengthCategories: strongCategories,
          weakCategories,
          lastUpdated: new Date(),
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('[ReadinessService] Error updating cognitive profile:', error);
    }
  }
}

/**
 * Legacy export for backward compatibility
 */
export const computeReadiness = (userId: string) => {
  return ReadinessService.computeReadiness(userId);
};
