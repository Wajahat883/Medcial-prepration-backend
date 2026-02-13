import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { SessionTokenService } from '../services/session-token.service';
import {
  generateQuestionAccessToken,
  validateQuestionAccessToken,
  handleContentViolation,
  checkAccessPermission,
  generateContentWatermark,
  getUserSecurityStatus,
} from '../utils/token-management';
import { AppError } from '../middleware/errorHandler';

// POST /api/security/generate-token
export const generateToken = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { questionId, sessionId, expiresInMinutes = 60 } = req.body;
    const userId = req.user!._id.toString();

    // Check if user is suspended
    const isSuspended = await SessionTokenService.isAccountSuspended(userId);
    if (isSuspended) {
      return next(new AppError('Your account has been suspended', 403));
    }

    const token = await generateQuestionAccessToken(userId, questionId, sessionId, expiresInMinutes);

    res.json({
      success: true,
      data: {
        token,
        expiresIn: expiresInMinutes * 60,
        type: 'Bearer',
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/security/validate-token
export const validateToken = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { token } = req.body;
    const userId = req.user!._id.toString();

    if (!token) {
      return res.json({
        success: false,
        data: false,
        message: 'Token is required',
      });
    }

    const result = await validateQuestionAccessToken(token, userId);

    res.json({
      success: result.valid,
      data: result.valid,
      message: result.error || 'Token is valid',
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/security/log-violation
export const logViolation = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { violationType } = req.body;
    const userId = req.user!._id.toString();

    if (!violationType) {
      return next(new AppError('Violation type is required', 400));
    }

    const context = {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
    };

    const result = await handleContentViolation(userId, violationType, context);

    res.json({
      success: true,
      data: {
        logged: result.logged,
        violationCount: result.violationCount,
        accountFlagged: result.accountFlagged,
        accountSuspended: result.accountSuspended,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/security/check-access - Check if user can access content
export const checkAccess = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id.toString();

    const result = await checkAccessPermission(userId);

    if (!result.canAccess) {
      return res.status(403).json({
        success: false,
        data: {
          canAccess: false,
          reason: result.reason,
          suspensionUntil: result.suspensionUntil,
        },
      });
    }

    res.json({
      success: true,
      data: { canAccess: true },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/security/watermark - Generate watermark for content protection
export const generateWatermark = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { questionId } = req.body;
    const userId = req.user!._id.toString();
    const userEmail = req.user!.email;

    if (!questionId) {
      return next(new AppError('Question ID is required', 400));
    }

    const watermark = generateContentWatermark(userId, questionId, userEmail);

    res.json({
      success: true,
      data: watermark,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/security/status - Get security status
export const getSecurityStatus = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id.toString();

    const status = await getUserSecurityStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/security/revoke-tokens - Revoke all tokens for user
export const revokeAllTokens = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!._id.toString();

    await SessionTokenService.revokeAllTokens(userId);

    res.json({
      success: true,
      message: 'All tokens revoked successfully',
    });
  } catch (error) {
    next(error);
  }
};
