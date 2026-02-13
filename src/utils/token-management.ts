import { SessionTokenService } from '../services/session-token.service';
import jwt from 'jsonwebtoken';

/**
 * Generate a session token for question access
 */
export async function generateQuestionAccessToken(
  userId: string,
  questionId: string,
  sessionId?: string,
  expiresInMinutes: number = 60
): Promise<string> {
  const payload = await SessionTokenService.createQuestionToken(
    userId,
    sessionId,
    questionId,
    expiresInMinutes
  );

  // Also create JWT for client-side validation
  const jwtToken = jwt.sign(
    {
      tokenId: payload.tokenId,
      userId: payload.userId,
      questionId: payload.questionId,
      type: 'question_access',
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: `${expiresInMinutes}m` }
  );

  return jwtToken;
}

/**
 * Validate question access token
 */
export async function validateQuestionAccessToken(
  token: string,
  userId: string
): Promise<{ valid: boolean; tokenId?: string; error?: string }> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;

    if (decoded.userId !== userId) {
      return {
        valid: false,
        error: 'Token does not match user ID',
      };
    }

    // Validate the token in database
    const isValid = await SessionTokenService.validateToken(decoded.tokenId, userId);

    if (!isValid) {
      return {
        valid: false,
        error: 'Token is invalid or expired',
      };
    }

    return {
      valid: true,
      tokenId: decoded.tokenId,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err.message,
    };
  }
}

/**
 * Create batch tokens for multiple questions in a session
 */
export async function generateBatchQuestionTokens(
  userId: string,
  questionIds: string[],
  sessionId: string,
  expiresInMinutes: number = 120
): Promise<Record<string, string>> {
  const tokens: Record<string, string> = {};

  for (const questionId of questionIds) {
    const token = await generateQuestionAccessToken(
      userId,
      questionId,
      sessionId,
      expiresInMinutes
    );
    tokens[questionId] = token;
  }

  return tokens;
}

/**
 * Handle violation detection and escalation
 */
export async function handleContentViolation(
  userId: string,
  violationType: 'copy_attempt' | 'paste_attempt' | 'screenshot' | 'selection_attempt',
  context?: {
    ipAddress?: string;
    userAgent?: string;
    questionId?: string;
    timestamp?: Date;
  }
): Promise<{
  logged: boolean;
  violationCount: number;
  accountFlagged: boolean;
  accountSuspended: boolean;
}> {
  // Log the violation
  await SessionTokenService.logViolation(userId, violationType, context);

  // Get violation history
  const history = await SessionTokenService.getViolationHistory(userId, 1);

  // Check if account is suspended
  const isSuspended = await SessionTokenService.isAccountSuspended(userId);

  return {
    logged: true,
    violationCount: history.totalViolations,
    accountFlagged: history.totalViolations >= 5,
    accountSuspended: isSuspended,
  };
}

/**
 * Check if user can access content
 */
export async function checkAccessPermission(
  userId: string
): Promise<{
  canAccess: boolean;
  reason?: string;
  suspensionUntil?: Date;
}> {
  const isSuspended = await SessionTokenService.isAccountSuspended(userId);

  if (isSuspended) {
    const details = await SessionTokenService.getSuspensionDetails(userId);
    return {
      canAccess: false,
      reason: `Your account has been suspended due to: ${details?.reason}`,
      suspensionUntil: details?.suspensionUntil,
    };
  }

  return { canAccess: true };
}

/**
 * Generate watermark for content protection
 */
export function generateContentWatermark(
  userId: string,
  questionId: string,
  userEmail: string
): {
  watermarkToken: string;
  visibleMark: string;
  metadata: Record<string, any>;
} {
  const watermarkToken = SessionTokenService.generateWatermark(userId, questionId);

  // Create a visible watermark for screenshots
  const timestamp = new Date().toISOString();
  const visibleMark = `User: ${userEmail} | Generated: ${timestamp}`;

  return {
    watermarkToken,
    visibleMark,
    metadata: {
      userId,
      questionId,
      timestamp,
      email: userEmail,
    },
  };
}

/**
 * Validate recovered watermark from screenshot
 */
export function validateContentWatermark(watermark: string) {
  return SessionTokenService.validateWatermark(watermark);
}

/**
 * Cleanup utility - should be run periodically via cron job
 */
export async function cleanupExpiredTokens() {
  return SessionTokenService.cleanupExpiredTokens();
}

/**
 * Generate session for practice mode
 */
export async function createPracticeSession(
  userId: string,
  sessionDurationMinutes: number = 120
): Promise<{
  sessionId: string;
  tokens: { sessionToken: string; refreshToken: string };
  expiresAt: Date;
}> {
  const sessionToken = jwt.sign(
    {
      userId,
      type: 'practice_session',
      sessionStart: new Date(),
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: `${sessionDurationMinutes}m` }
  );

  const refreshToken = jwt.sign(
    {
      userId,
      type: 'refresh_token',
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );

  return {
    sessionId: sessionToken.substring(0, 32),
    tokens: {
      sessionToken,
      refreshToken,
    },
    expiresAt: new Date(Date.now() + sessionDurationMinutes * 60 * 1000),
  };
}

/**
 * Revoke user session
 */
export async function revokeUserSessions(userId: string): Promise<{
  revoked: boolean;
  tokensRevoked: number;
}> {
  await SessionTokenService.revokeAllTokens(userId);

  return {
    revoked: true,
    tokensRevoked: 0, // Count would be obtained from database
  };
}

/**
 * Get security status for a user
 */
export async function getUserSecurityStatus(userId: string) {
  const suspensionDetails = await SessionTokenService.getSuspensionDetails(userId);
  const violationHistory = await SessionTokenService.getViolationHistory(userId, 30);

  return {
    isSuspended: !!suspensionDetails,
    suspensionDetails,
    violationSummary: {
      totalViolations: violationHistory.totalViolations,
      criticalViolations: violationHistory.violationsBySeverity.critical,
      highViolations: violationHistory.violationsBySeverity.high,
      recentViolations: violationHistory.recentViolations,
    },
    riskLevel: calculateSecurityRiskLevel(violationHistory),
  };
}

/**
 * Calculate risk level based on violations
 */
function calculateSecurityRiskLevel(violationHistory: any): 'low' | 'medium' | 'high' | 'critical' {
  if (violationHistory.violationsBySeverity.critical > 0) return 'critical';
  if (violationHistory.violationsBySeverity.high > 2) return 'high';
  if (violationHistory.totalViolations > 5) return 'medium';
  return 'low';
}
