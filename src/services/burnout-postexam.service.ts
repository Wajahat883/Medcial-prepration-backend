import { Types } from 'mongoose';
import { UserWellness, PostExamFeedback } from '../models/Phase4Models';
import { StudentPerformanceDetail } from '../models/StudentPerformanceDetail';

/**
 * Phase 4: Burnout Detection Service
 * Monitors study patterns and detects burnout risk
 */
export class BurnoutDetectionService {
  /**
   * Analyze student performance trends
   * Check for accuracy decline, time decline, frequency decline
   */
  static async analyzeBurnoutRisk(userId: string): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    declineIndicators: { accuracyDeclining: boolean; timeDeclining: boolean; frequencyDeclining: boolean };
    interventionMessage?: string;
    recommendations: string[];
  }> {
    // Get last 7 days of performance data
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const performanceData = await StudentPerformanceDetail.find({
      userId: new Types.ObjectId(userId),
      attemptedAt: { $gte: sevenDaysAgo },
    }).sort({ attemptedAt: 1 });

    if (performanceData.length < 3) {
      return {
        riskLevel: 'low',
        declineIndicators: { accuracyDeclining: false, timeDeclining: false, frequencyDeclining: false },
        recommendations: ['Keep up consistent practice to build data for wellness monitoring'],
      };
    }

    // Split into first half and second half
    const halfway = Math.floor(performanceData.length / 2);
    const firstHalf = performanceData.slice(0, halfway);
    const secondHalf = performanceData.slice(halfway);

    // Calculate metrics
    const firstHalfAccuracy =
      firstHalf.reduce((sum, p) => sum + ((p.errorType === 'none' || !p.errorType) ? 1 : 0), 0) / firstHalf.length;
    const secondHalfAccuracy =
      secondHalf.reduce((sum, p) => sum + ((p.errorType === 'none' || !p.errorType) ? 1 : 0), 0) / secondHalf.length;

    const firstHalfTime =
      firstHalf.reduce((sum, p) => sum + (p.timeTaken || 0), 0) / firstHalf.length;
    const secondHalfTime = secondHalf.reduce((sum, p) => sum + (p.timeTaken || 0), 0) / secondHalf.length;

    const accuracyDeclining = secondHalfAccuracy < firstHalfAccuracy * 0.95; // 5% decline
    const timeDeclining = secondHalfTime > firstHalfTime * 1.1; // 10% increase in time
    const frequencyDeclining = performanceData.length < 20; // Less than 3 questions per day

    const declineCount = [accuracyDeclining, timeDeclining, frequencyDeclining].filter(Boolean).length;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (declineCount === 3) riskLevel = 'high';
    else if (declineCount >= 2) riskLevel = 'medium';

    const interventionMessage = this.generateIntervention(
      accuracyDeclining,
      timeDeclining,
      frequencyDeclining
    );
    const recommendations = this.generateRecommendations(riskLevel, {
      accuracyDeclining,
      timeDeclining,
      frequencyDeclining,
    });

    // Save to wellness model
    await UserWellness.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        lastSevenDaysAccuracy: performanceData.map((p) => ((p.errorType === 'none' || !p.errorType) ? 1 : 0)),
        lastSevenDaysSessionDuration: performanceData.map((p) => p.timeTaken || 0),
        lastSevenDaysSessionFrequency: performanceData.length,
        burnoutRiskLevel: riskLevel,
        declineIndicators: { accuracyDeclining, timeDeclining, frequencyDeclining },
        recommendedAction: interventionMessage,
      },
      { upsert: true, new: true }
    );

    return {
      riskLevel,
      declineIndicators: { accuracyDeclining, timeDeclining, frequencyDeclining },
      interventionMessage,
      recommendations,
    };
  }

  /**
   * Generate intervention message based on decline patterns
   */
  private static generateIntervention(
    accuracyDeclining: boolean,
    timeDeclining: boolean,
    frequencyDeclining: boolean
  ): string {
    if (accuracyDeclining && timeDeclining && frequencyDeclining) {
      return "Your brain needs recovery. You're showing signs of burnout. Take 2-3 days completely off, then return with 50% reduced daily load.";
    }
    if (accuracyDeclining && timeDeclining) {
      return "Your accuracy is declining and you're taking longer. Time for active recovery: lighter practice, focus on comprehension over speed. Take tomorrow off.";
    }
    if (accuracyDeclining) {
      return "Your accuracy is declining. Your brain needs recovery. Take 1-2 days off, then resume with focused high-yield topics only.";
    }
    if (timeDeclining && frequencyDeclining) {
      return "You're practicing less frequently and taking longer per question. Motivation dip detected. We're tracking your progress and you're on track for success.";
    }
    if (timeDeclining) {
      return "You're taking longer per question. Time for speed drills: practice 25-minute focused sessions on single topics.";
    }
    if (frequencyDeclining) {
      return "Your practice frequency is declining. Even 10 questions a day keeps momentum. Schedule a specific time block.";
    }
    return '';
  }

  /**
   * Generate personalized recommendations
   */
  private static generateRecommendations(
    riskLevel: string,
    declines: { accuracyDeclining: boolean; timeDeclining: boolean; frequencyDeclining: boolean }
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'high') {
      recommendations.push('Take 2-3 days complete break from studying');
      recommendations.push('Reduce daily question load to 50% of normal');
      recommendations.push('Focus on wellness: sleep 8h, exercise, nutrition');
    }

    if (declines.accuracyDeclining) {
      recommendations.push('Review fundamentals in weak subject areas');
      recommendations.push('Practice understanding over speed for 1 week');
      recommendations.push('Reduce daily questions by 25% to focus on quality');
    }

    if (declines.timeDeclining) {
      recommendations.push('Do 15-minute speed drills on single topics');
      recommendations.push('Set timer for 2-3 minutes per question');
      recommendations.push('Practice decision-making speed without compromising accuracy');
    }

    if (declines.frequencyDeclining) {
      recommendations.push('Schedule fixed study time: 1 hour, 5 days/week minimum');
      recommendations.push('Small consistent practice beats cramming');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current study pace and focus');
      recommendations.push('Consider increasing practice frequency for faster improvement');
    }

    return recommendations;
  }

  /**
   * Get wellness summary for dashboard
   */
  static async getWellnessSummary(userId: string) {
    const wellness = await UserWellness.findOne({ userId: new Types.ObjectId(userId) });
    return wellness || { burnoutRiskLevel: 'low', declineIndicators: {}, recommendations: [] };
  }
}

/**
 * Phase 4: Post-Exam Feedback Service
 * Collects and aggregates user feedback after exam attempts
 */
export class PostExamFeedbackService {
  /**
   * Submit post-exam feedback
   */
  static async submitFeedback(userId: string, examId: string, feedbackData: any) {
    return PostExamFeedback.create({
      userId: new Types.ObjectId(userId),
      examId: new Types.ObjectId(examId),
      ...feedbackData,
    });
  }

  /**
   * Analyze feedback patterns
   * Identify discrepancies: "75% of users found cardiology hard, but accuracy was 71%"
   */
  static async analyzeFeedbackPatterns(examId: string, daysBack: number = 30) {
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const feedbackData = await PostExamFeedback.aggregate([
      {
        $match: {
          examId: new Types.ObjectId(examId),
          submittedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          avgPerceivedDifficulty: {
            $avg: {
              $cond: [
                { $eq: ['$perceivedDifficulty', 'hard'] },
                3,
                { $cond: [{ $eq: ['$perceivedDifficulty', 'medium'] }, 2, 1] },
              ],
            },
          },
          avgActualPerformance: { $avg: '$actualPerformance' },
          avgTimePressure: { $avg: '$examExperience.timePressure' },
          avgClarity: { $avg: '$examExperience.clarity' },
          avgDifficulty: { $avg: '$examExperience.difficulty' },
          totalResponses: { $sum: 1 },
        },
      },
    ]);

    // Also get most frequent unfamiliar topics
    const topicFrequency = await PostExamFeedback.aggregate([
      {
        $match: {
          examId: new Types.ObjectId(examId),
          submittedAt: { $gte: startDate },
        },
      },
      { $unwind: '$unfamiliarTopics' },
      {
        $group: {
          _id: '$unfamiliarTopics',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    return {
      feedbackStats: feedbackData[0] || {},
      topUnfamiliarTopics: topicFrequency,
    };
  }

  /**
   * Generate quarterly content improvement recommendations
   * Based on feedback discrepancies
   */
  static async generateContentImprovementReport(examId: string) {
    const patterns = await this.analyzeFeedbackPatterns(examId, 90);
    const stats = patterns.feedbackStats;

    const report: any = {
      period: 'Last 90 days',
      totalFeeedbacksCollected: stats.totalResponses || 0,
      insights: [],
      recommendations: [],
    };

    // Check for difficulty discrepancy
    const perceivedDifficulty = stats.avgPerceivedDifficulty || 2;
    const actualDifficulty = stats.avgDifficulty || 2;
    const difficultyGap = Math.abs(perceivedDifficulty - actualDifficulty);

    if (difficultyGap > 0.5) {
      report.insights.push(
        `Difficulty Mismatch: Users perceived difficulty ${perceivedDifficulty.toFixed(1)}/5, issues were ${actualDifficulty.toFixed(1)}/5`
      );
      if (actualDifficulty > perceivedDifficulty) {
        report.recommendations.push('Questions may be harder than anticipated. Review and simplify critical steps.');
      } else {
        report.recommendations.push('Questions may be easier than needed. Add more complex scenarios.');
      }
    }

    // Check for time pressure
    if ((stats.avgTimePressure || 0) > 3.5) {
      report.insights.push('High Time Pressure: Users reporting significant time constraints');
      report.recommendations.push('Review question lengths and reduce unnecessary verbosity');
    }

    // Check for clarity
    if ((stats.avgClarity || 0) < 3) {
      report.insights.push('Clarity Issues: Users reporting unclear questions');
      report.recommendations.push('Review question wording and improve disambiguation');
    }

    // Check unfamiliar topics
    if (patterns.topUnfamiliarTopics.length > 0) {
      report.insights.push(
        `Top Unfamiliar Topics: ${patterns.topUnfamiliarTopics.map((t) => t._id).join(', ')}`
      );
      report.recommendations.push(
        `Create supplementary content and examples for: ${patterns.topUnfamiliarTopics.slice(0, 3).map((t) => t._id).join(', ')}`
      );
    }

    return report;
  }

  /**
   * Update recall heatmap based on feedback
   * Topics where many users reported unfamiliarity should get weight boost
   */
  static async updateRecallPriorities(examId: string) {
    const patterns = await this.analyzeFeedbackPatterns(examId);
    return {
      boostedTopics: patterns.topUnfamiliarTopics.map((t) => ({
        topic: t._id,
        currentFrequency: t.count,
        recommendedBoost: 'increase_recall_frequency',
      })),
    };
  }
}

export default { BurnoutDetectionService, PostExamFeedbackService };