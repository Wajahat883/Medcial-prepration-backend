import { SessionToken } from '../models/SessionToken';
import { Session } from '../models/Session';
import { ContentViolationLog } from '../models/ContentViolationLog';
import mongoose from 'mongoose';
import crypto from 'crypto';

export interface ISessionTokenPayload {
  tokenId: string;
  userId: string;
  sessionId?: string;
  questionId?: string;
  createdAt: Date;
  expiresAt: Date;
  usageLimit?: number;
}

export class SessionTokenService {
  /**
   * Generate a secure session token
   */
  static generateToken(userId: string, expiresInMinutes: number = 30): string {
    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    return token;
  }

  /**
   * Create a session token for question access
   */
  static async createQuestionToken(
    userId: string,
    sessionId?: string,
    questionId?: string,
    expiresInMinutes: number = 60
  ): Promise<ISessionTokenPayload> {
    const tokenId = this.generateToken(userId, expiresInMinutes);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const token = await SessionToken.create({
      tokenId,
      userId: new mongoose.Types.ObjectId(userId),
      sessionId: sessionId ? new mongoose.Types.ObjectId(sessionId) : null,
      questionId: questionId ? new mongoose.Types.ObjectId(questionId) : null,
      expiresAt,
      usedCount: 0,
    });

    return {
      tokenId: token.tokenId,
      userId: token.userId.toString(),
      sessionId: token.sessionId?.toString(),
      questionId: token.questionId?.toString(),
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
    };
  }

  /**
   * Validate a session token
   */
  static async validateToken(tokenId: string, userId: string): Promise<boolean> {
    const token = await SessionToken.findOne({
      tokenId,
      userId: new mongoose.Types.ObjectId(userId),
      expiresAt: { $gt: new Date() },
    });

    if (!token) {
      // Log potential violation attempt
      await ContentViolationLog.create({
        userId: new mongoose.Types.ObjectId(userId),
        violationType: 'invalid_token_attempt',
        details: { tokenId },
        timestamp: new Date(),
        severity: 'low',
      });
      return false;
    }

    // Increment usage count
    await SessionToken.findByIdAndUpdate(token._id, {
      usedCount: token.usedCount + 1,
    });

    return true;
  }

  /**
   * Revoke a session token
   */
  static async revokeToken(tokenId: string) {
    await SessionToken.deleteOne({ tokenId });
  }

  /**
   * Revoke all tokens for a user
   */
  static async revokeAllTokens(userId: string) {
    await SessionToken.deleteMany({
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  /**
   * Log a violation (copy/paste/screenshot attempt)
   */
  static async logViolation(
    userId: string,
    violationType: 'copy_attempt' | 'paste_attempt' | 'screenshot' | 'selection_attempt',
    details?: any
  ) {
    const violation = await ContentViolationLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      violationType,
      details,
      timestamp: new Date(),
      severity: 'medium',
      ipAddress: details?.ipAddress || '',
      userAgent: details?.userAgent || '',
    });

    // Check if user has > 5 violations in last 24 hours
    const violationCount = await ContentViolationLog.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (violationCount > 5) {
      // Flag account for review
      await this.flagAccountForReview(userId, 'Multiple content protection violations detected');
    }

    return violation;
  }

  /**
   * Flag an account for review
   */
  static async flagAccountForReview(userId: string, reason: string) {
    // Create a high-severity violation record
    await ContentViolationLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      violationType: 'account_flagged',
      details: { reason },
      timestamp: new Date(),
      severity: 'high',
    });

    // Store flag in database for admin review
    // In production, this would trigger a notification to admins
    console.warn(`[ALERT] Account ${userId} flagged for review: ${reason}`);
  }

  /**
   * Suspend an account for piracy violations
   */
  static async suspendAccount(userId: string, reason: string, suspensionDays: number = 7) {
    const suspensionUntil = new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000);

    // Create violation record with suspension flag
    await ContentViolationLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      violationType: 'account_suspended',
      details: { reason, suspensionUntil },
      timestamp: new Date(),
      severity: 'critical',
    });

    // Revoke all tokens for the user
    await this.revokeAllTokens(userId);

    // Log this escalation
    console.error(`[CRITICAL] Account ${userId} suspended until ${suspensionUntil}: ${reason}`);

    return { userId, suspensionUntil };
  }

  /**
   * Get violation history for a user
   */
  static async getViolationHistory(userId: string, daysBack: number = 30) {
    const minDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const violations = await ContentViolationLog.find({
      userId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: minDate },
    }).sort({ timestamp: -1 });

    const summary = {
      totalViolations: violations.length,
      violationsBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      violationsByType: {} as Record<string, number>,
      recentViolations: violations.slice(0, 5),
    };

    violations.forEach((v: any) => {
      summary.violationsBySeverity[v.severity] += 1;
      summary.violationsByType[v.violationType] = (summary.violationsByType[v.violationType] || 0) + 1;
    });

    return summary;
  }

  /**
   * Clean up expired tokens (run periodically)
   */
  static async cleanupExpiredTokens() {
    const result = await SessionToken.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    console.log(`[SessionTokenService] Cleaned up ${result.deletedCount} expired tokens`);
    return result;
  }

  /**
   * Check if user is account suspended
   */
  static async isAccountSuspended(userId: string): Promise<boolean> {
    const suspensionRecord = await ContentViolationLog.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      violationType: 'account_suspended',
      'details.suspensionUntil': { $gt: new Date() },
    });

    return !!suspensionRecord;
  }

  /**
   * Get suspension details if account is suspended
   */
  static async getSuspensionDetails(userId: string) {
    const suspensionRecord = await ContentViolationLog.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      violationType: 'account_suspended',
    });

    if (!suspensionRecord) return null;

    return {
      reason: suspensionRecord.actionTaken || 'Account suspended',
      suspensionUntil: suspensionRecord.timestamp,
      createdAt: suspensionRecord.timestamp,
    };
  }

  /**
   * Validate watermark on question access (for piracy protection)
   */
  static generateWatermark(userId: string, questionId: string): string {
    // Generate invisible watermark with user ID embedded
    const watermarkData = JSON.stringify({
      userId,
      questionId,
      timestamp: new Date().getTime(),
    });

    // Encode with base64 for steganography
    const watermark = Buffer.from(watermarkData).toString('base64');
    return watermark;
  }

  /**
   * Validate and decode watermark
   */
  static validateWatermark(watermark: string): { userId: string; questionId: string; timestamp: number } | null {
    try {
      const decoded = Buffer.from(watermark, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
}
