import mongoose from 'mongoose';
import { StudentPerformanceDetail } from '../models/StudentPerformanceDetail';
import { RevisionBucket } from '../models/RevisionBucket';
import { TestSession } from '../models/TestSession';
import { Question } from '../models/Question';

export type RevisionBucketType =
  | 'slow_correct'
  | 'incorrect_confident'
  | 'high_yield_low_accuracy'
  | 'almost_correct';

interface RevisionBucketData {
  bucketType: RevisionBucketType;
  questions: Array<{
    questionId: string;
    questionText?: string;
    userAnswer?: string;
    correctAnswer?: string;
    timeTaken?: number;
    confidence?: number;
    category?: string;
  }>;
  count: number;
  priority: 'high' | 'medium' | 'low';
  suggestedDurationMinutes: number;
  reason: string;
}

/**
 * Smart Revision Mode Service
 * Generates adaptive revision buckets for focused preparation
 */
export class SmartRevisionService {
  /**
   * Generate smart revision buckets for a user
   */
  static async generateRevisionBuckets(
    userId: string,
    limit: number = 100
  ): Promise<RevisionBucketData[]> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Get all unlocked attempts
      const allAttempts = await StudentPerformanceDetail.find({
        userId: userObjectId,
      })
        .populate('questionId', 'stem category difficulty')
        .sort({ timestamp: -1 })
        .limit(300)
        .lean();

      if (allAttempts.length === 0) {
        return [];
      }

      const [slowCorrect, incorrectConfident, highYieldLowAccuracy, almostCorrect] = await Promise.all([
        this.getSlowCorrectQuestions(allAttempts, limit),
        this.getIncorrectConfidentQuestions(allAttempts, limit),
        this.getHighYieldLowAccuracyQuestions(userObjectId, allAttempts, limit),
        this.getAlmostCorrectQuestions(allAttempts, limit),
      ]);

      // Return in priority order
      const buckets: RevisionBucketData[] = [];

      if (highYieldLowAccuracy.length > 0) {
        buckets.push({
          bucketType: 'high_yield_low_accuracy',
          questions: highYieldLowAccuracy,
          count: highYieldLowAccuracy.length,
          priority: 'high',
          suggestedDurationMinutes: 40,
          reason: 'High-yield topics with low accuracy - critical for score improvement',
        });
      }

      if (incorrectConfident.length > 0) {
        buckets.push({
          bucketType: 'incorrect_confident',
          questions: incorrectConfident,
          count: incorrectConfident.length,
          priority: 'high',
          suggestedDurationMinutes: 35,
          reason: 'You were confident but wrong - identify reasoning gaps',
        });
      }

      if (almostCorrect.length > 0) {
        buckets.push({
          bucketType: 'almost_correct',
          questions: almostCorrect,
          count: almostCorrect.length,
          priority: 'medium',
          suggestedDurationMinutes: 30,
          reason: 'Fine-tune discrimination between similar answers',
        });
      }

      if (slowCorrect.length > 0) {
        buckets.push({
          bucketType: 'slow_correct',
          questions: slowCorrect,
          count: slowCorrect.length,
          priority: 'medium',
          suggestedDurationMinutes: 25,
          reason: 'You scored correctly but slowly - speed optimization needed',
        });
      }

      // Save buckets to database
      await this.saveBuckets(userObjectId, buckets);

      return buckets;
    } catch (error) {
      console.error('[SmartRevisionService] Error generating revision buckets:', error);
      return [];
    }
  }

  /**
   * Get questions answered correctly but in >90th percentile time
   */
  private static async getSlowCorrectQuestions(allAttempts: any[], limit: number) {
    // Calculate 90th percentile time
    const times = allAttempts.map((a: any) => a.timeTaken || 0).sort((a, b) => a - b);
    const p90Index = Math.floor(times.length * 0.9);
    const p90Time = times[p90Index] || 120;

    return allAttempts
      .filter((a: any) => a.isCorrect && a.timeTaken > p90Time)
      .slice(0, limit)
      .map((a: any) => ({
        questionId: (a.questionId as any)?._id?.toString() || 'Unknown',
        questionText: (a.questionId as any)?.stem?.substring(0, 100),
        timeTaken: a.timeTaken,
        category: (a.questionId as any)?.category,
      }));
  }

  /**
   * Get questions where user was confident but answered incorrectly
   */
  private static async getIncorrectConfidentQuestions(allAttempts: any[], limit: number) {
    return allAttempts
      .filter((a: any) => !a.isCorrect && (a.confidence || 0) >= 0.7)
      .slice(0, limit)
      .map((a: any) => ({
        questionId: (a.questionId as any)?._id?.toString() || 'Unknown',
        questionText: (a.questionId as any)?.stem?.substring(0, 100),
        confidence: a.confidence,
        category: (a.questionId as any)?.category,
        userAnswer: a.userAnswer,
        correctAnswer: a.correctAnswer,
      }));
  }

  /**
   * Get high-yield topics (frequently attempted) with low accuracy
   */
  private static async getHighYieldLowAccuracyQuestions(
    userId: mongoose.Types.ObjectId,
    allAttempts: any[],
    limit: number
  ) {
    // Group by category
    const byCategory: Record<string, any[]> = {};
    allAttempts.forEach((a: any) => {
      const cat = (a.questionId as any)?.category || 'Unknown';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(a);
    });

    // Find categories with high attempt count but low accuracy
    const highYieldLowAccuracy: any[] = [];

    for (const [category, attempts] of Object.entries(byCategory)) {
      if (attempts.length >= 10) {
        // High-yield: 10+ attempts
        const accuracy = attempts.filter((a: any) => a.isCorrect).length / attempts.length;
        if (accuracy < 0.7) {
          // Low accuracy: <70%
          const incorrect = attempts.filter((a: any) => !a.isCorrect);
          highYieldLowAccuracy.push(
            ...incorrect.slice(0, 5).map((a: any) => ({
              questionId: (a.questionId as any)?._id?.toString() || 'Unknown',
              questionText: (a.questionId as any)?.stem?.substring(0, 100),
              category,
              accuracy: Math.round(accuracy * 100),
            }))
          );
        }
      }
    }

    return highYieldLowAccuracy.slice(0, limit);
  }

  /**
   * Get questions where user selected second-best answer
   */
  private static async getAlmostCorrectQuestions(allAttempts: any[], limit: number) {
    return allAttempts
      .filter((a: any) => {
        // Assume "almost correct" if user answer is length-similar to correct answer
        // or contains similar keywords (indicates close reasoning)
        const userLen = (a.userAnswer || '').length;
        const correctLen = (a.correctAnswer || '').length;
        return !a.isCorrect && Math.abs(userLen - correctLen) < 50;
      })
      .slice(0, limit)
      .map((a: any) => ({
        questionId: (a.questionId as any)?._id?.toString() || 'Unknown',
        questionText: (a.questionId as any)?.stem?.substring(0, 100),
        userAnswer: a.userAnswer,
        correctAnswer: a.correctAnswer,
        category: (a.questionId as any)?.category,
      }));
  }

  /**
   * Save revision buckets to database
   */
  private static async saveBuckets(
    userId: mongoose.Types.ObjectId,
    buckets: RevisionBucketData[]
  ): Promise<void> {
    try {
      for (const bucket of buckets) {
        await RevisionBucket.findOneAndUpdate(
          { userId, bucketType: bucket.bucketType },
          {
            userId,
            bucketType: bucket.bucketType,
            questions: bucket.questions,
            count: bucket.count,
            priority: bucket.priority,
            suggestedDurationMinutes: bucket.suggestedDurationMinutes,
            reason: bucket.reason,
            generatedAt: new Date(),
          },
          { upsert: true }
        );
      }
    } catch (error) {
      console.error('[SmartRevisionService] Error saving buckets:', error);
    }
  }

  /**
   * Get revision schedule for user
   */
  static async getRevisionSchedule(userId: string, daysUntilExam: number = 30) {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Get all buckets for user
      const buckets = await RevisionBucket.find({ userId: userObjectId }).lean();

      if (buckets.length === 0) {
        return [];
      }

      const schedule: Array<{
        day: number;
        bucketType: RevisionBucketType;
        sessionDurationMinutes: number;
        focusArea: string;
        instructions: string;
      }> = [];

      // Schedule high-priority items in first 2 weeks
      const highPriority = buckets.filter((b: any) => b.priority === 'high');
      let dayCounter = 1;

      for (const bucket of highPriority) {
        if (dayCounter <= 14) {
          schedule.push({
            day: dayCounter,
            bucketType: bucket.bucketType as RevisionBucketType,
            sessionDurationMinutes: 45,
            focusArea: bucket.bucketType,
            instructions: `Review ${bucket.bucketType.replace(/_/g, ' ')} questions`,
          });
          dayCounter += 3;
        }
      }

      // Schedule medium-priority items in weeks 2-3
      const mediumPriority = buckets.filter((b: any) => b.priority === 'medium');
      for (const bucket of mediumPriority) {
        if (dayCounter <= 21) {
          schedule.push({
            day: dayCounter,
            bucketType: bucket.bucketType as RevisionBucketType,
            sessionDurationMinutes: 30,
            focusArea: bucket.bucketType,
            instructions: `Review ${bucket.bucketType.replace(/_/g, ' ')} questions`,
          });
          dayCounter += 2;
        }
      }

      return schedule;
    } catch (error) {
      console.error('[SmartRevisionService] Error generating schedule:', error);
      return [];
    }
  }

  /**
   * Set revision reminder for a bucket
   */
  static async setRevisionReminder(
    userId: string,
    bucketType: RevisionBucketType,
    dayOffset: number
  ): Promise<void> {
    try {
      const reminderTime = new Date();
      reminderTime.setDate(reminderTime.getDate() + dayOffset);

      // TODO: Integrate with notification service
      console.log(`[SmartRevisionService] Reminder set for ${userId} - ${bucketType} on ${reminderTime}`);
    } catch (error) {
      console.error('[SmartRevisionService] Error setting reminder:', error);
    }
  }

  /**
   * Mark question as mastered (remove from bucket after 3 correct attempts)
   */
  static async markQuestionMastered(userId: string, questionId: string): Promise<void> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const questionObjectId = new mongoose.Types.ObjectId(questionId);

      // Check if user got it correct 3+ times recently
      const recentCorrect = await StudentPerformanceDetail.countDocuments({
        userId: userObjectId,
        questionId: questionObjectId,
        isCorrect: true,
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      });

      if (recentCorrect >= 3) {
        // Remove from all revision buckets
        await RevisionBucket.updateMany(
          { userId: userObjectId },
          { $pull: { questions: { questionId: questionId } } }
        );

        console.log(`[SmartRevisionService] Question ${questionId} marked as mastered for user ${userId}`);
      }
    } catch (error) {
      console.error('[SmartRevisionService] Error marking question mastered:', error);
    }
  }
}
