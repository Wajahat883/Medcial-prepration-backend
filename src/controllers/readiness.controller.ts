import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { ReadinessService } from '../services/readiness.service';
import { AppError } from '../middleware/errorHandler';

// GET /api/readiness/score/:userId - Get comprehensive readiness score with breakdown
export const getReadinessScore = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.params.userId === 'me' ? req.user?._id?.toString() : req.params.userId;
    
    if (!userId) {
      return next(new AppError('User ID is required', 400));
    }

    const readinessResult = await ReadinessService.computeReadiness(userId, true);

    res.json({
      success: true,
      data: readinessResult,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/readiness/breakdown/:userId - Get component breakdown
export const getReadinessBreakdown = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.params.userId === 'me' ? req.user?._id?.toString() : req.params.userId;
    
    if (!userId) {
      return next(new AppError('User ID is required', 400));
    }

    const breakdown = await ReadinessService.getReadinessBreakdown(userId);
    
    res.json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/readiness/history/:userId - Get readiness score history
export const getReadinessHistory = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.params.userId === 'me' ? req.user?._id?.toString() : req.params.userId;
    
    if (!userId) {
      return next(new AppError('User ID is required', 400));
    }

    const trends = await ReadinessService.getReadinessTrends(userId, 30);

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/readiness/trends/:userId - Get readiness trends
export const getReadinessTrends = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.params.userId === 'me' ? req.user?._id?.toString() : req.params.userId;
    const daysBack = parseInt(req.query.daysBack as string) || 30;
    
    if (!userId) {
      return next(new AppError('User ID is required', 400));
    }

    const trends = await ReadinessService.getReadinessTrends(userId, daysBack);

    // Calculate trend analysis
    const trend = trends.length > 1 ? trends[trends.length - 1].score - trends[0].score : 0;
    const average = trends.length > 0 ? trends.reduce((sum: number, t: any) => sum + t.score, 0) / trends.length : 0;

    res.json({
      success: true,
      data: {
        scores: trends,
        summary: {
          average: Math.round(average * 100) / 100,
          trend: Math.round(trend * 100) / 100,
          highest: trends.length > 0 ? Math.max(...trends.map((t: any) => t.score)) : 0,
          lowest: trends.length > 0 ? Math.min(...trends.map((t: any) => t.score)) : 0,
          dataPoints: trends.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/readiness/report/:userId - Get comprehensive readiness report
export const getReadinessReport = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.params.userId === 'me' ? req.user?._id?.toString() : req.params.userId;
    
    if (!userId) {
      return next(new AppError('User ID is required', 400));
    }

    const report = await ReadinessService.getReadinessReport(userId);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};
