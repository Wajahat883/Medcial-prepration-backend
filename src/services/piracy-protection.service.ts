import { Types } from 'mongoose';
import { PiracyViolation, IPiracyViolation } from '../models/Phase4Models';

/**
 * Phase 4: Piracy Protection Service
 * Handles watermarking, violation tracking, and content protection
 */
export class PiracyProtectionService {
  /**
   * Log a potential piracy violation
   */
  static async logViolation(
    userId: string,
    violationType: 'copy' | 'paste' | 'screenshot' | 'context-menu' | 'suspicious-access',
    questionId?: string,
    sessionId?: string,
    deviceInfo?: { userAgent: string; ipAddress: string },
    description?: string
  ): Promise<IPiracyViolation> {
    const violation = await PiracyViolation.create({
      userId: new Types.ObjectId(userId),
      violationType,
      questionId: questionId ? new Types.ObjectId(questionId) : undefined,
      sessionId,
      deviceInfo,
      severity: this.calculateSeverity(violationType),
      automcDescription: description || `${violationType} attempt detected`,
    });

    // Check if user should be flagged/suspended
    await this.checkViolationThreshold(userId);

    return violation;
  }

  /**
   * Calculate severity level based on violation type
   */
  private static calculateSeverity(violationType: string): 'low' | 'medium' | 'high' {
    const severityMap: Record<string, 'low' | 'medium' | 'high'> = {
      'context-menu': 'low',
      paste: 'low',
      copy: 'medium',
      screenshot: 'medium',
      'suspicious-access': 'high',
    };
    return severityMap[violationType] || 'low';
  }

  /**
   * Check if user exceeds violation threshold (>5 violations in 7 days)
   */
  static async checkViolationThreshold(userId: string): Promise<boolean> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentViolations = await PiracyViolation.countDocuments({
      userId: new Types.ObjectId(userId),
      createdAt: { $gte: sevenDaysAgo },
    });

    if (recentViolations > 5) {
      // Flag for admin review - could trigger auto-suspension
      await PiracyViolation.updateOne(
        { userId: new Types.ObjectId(userId) },
        { $set: { adminNotes: 'USER FLAGGED: Excessive violation attempts' } }
      );
      return true;
    }
    return false;
  }

  /**
   * Generate invisible watermark metadata
   * Embeds user ID and timestamp in question metadata
   */
  static generateWatermarkMetadata(userId: string, questionId: string): Record<string, any> {
    return {
      embeddedUserId: Buffer.from(userId).toString('base64'),
      embeddedTimestamp: Date.now(),
      embeddedQuestionId: Buffer.from(questionId).toString('base64'),
      watermarkToken: this.generateWatermarkToken(userId, questionId),
    };
  }

  /**
   * Create watermark token for PDF exports
   */
  private static generateWatermarkToken(userId: string, questionId: string): string {
    const hash = Buffer.from(`${userId}-${questionId}-${Date.now()}`).toString('base64');
    return `WATERMARK-${hash}`;
  }

  /**
   * Get violations for a user
   */
  static async getUserViolations(
    userId: string,
    days: number = 30
  ): Promise<IPiracyViolation[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return PiracyViolation.find({
      userId: new Types.ObjectId(userId),
      createdAt: { $gte: startDate },
    }).sort({ createdAt: -1 });
  }

  /**
   * Get flagged users for admin review
   */
  static async getFlaggedUsers(limit: number = 50): Promise<any[]> {
    const result = await PiracyViolation.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: '$userId',
          violationCount: { $sum: 1 },
          lastViolation: { $max: '$createdAt' },
          violationTypes: { $push: '$violationType' },
        },
      },
      {
        $match: { violationCount: { $gt: 5 } },
      },
      {
        $sort: { violationCount: -1 },
      },
      { $limit: limit },
    ]);
    return result;
  }

  /**
   * Add watermark text to question display (visible watermark)
   */
  static addVisibleWatermark(content: string, userId: string): string {
    const timestamp = new Date().toLocaleDateString();
    const watermarkText = `[USER: ${userId} | ${timestamp}]`;
    return `${content}\n\n--- ${watermarkText} ---`;
  }
}

export default PiracyProtectionService;