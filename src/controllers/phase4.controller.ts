import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import PiracyProtectionService from '../services/piracy-protection.service';
import { UXOptimizationService, MonetizationService } from '../services/ux-monetization.service';
import { BurnoutDetectionService, PostExamFeedbackService } from '../services/burnout-postexam.service';
import ExamManagementService from '../services/exam-management.service';

/**
 * Phase 4 Controller: Piracy Protection
 */
export const logPiracyViolationController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any
) => {
  try {
    const userId = req.user?._id?.toString();
    const {
      violationType,
      questionId,
      sessionId,
      deviceInfo,
      description,
    } = req.body;

    if (!userId || !violationType) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const violation = await PiracyProtectionService.logViolation(
      userId,
      violationType,
      questionId,
      sessionId,
      deviceInfo,
      description
    );

    res.json({
      success: true,
      data: violation,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserViolationsController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user?._id?.toString();
    const days = parseInt(req.query.days as string) || 30;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User authentication required' });
    }

    const violations = await PiracyProtectionService.getUserViolations(userId, days);

    res.json({
      success: true,
      data: violations,
      count: violations.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getWatermarkMetadataController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user?._id?.toString();
    const { questionId } = req.params;

    if (!userId || !questionId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const metadata = PiracyProtectionService.generateWatermarkMetadata(userId, questionId);

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phase 4 Controller: UX Optimization
 */
export const getUserUXPreferencesController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user?._id?.toString();

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User authentication required' });
    }

    const preferences = await UXOptimizationService.getUserPreferences(userId);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUXPreferencesController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user?._id?.toString();
    const updates = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User authentication required' });
    }

    const updated = await UXOptimizationService.updatePreferences(userId, updates);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const highlightLabValuesController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { stemText } = req.body;

    if (!stemText) {
      return res.status(400).json({ success: false, error: 'stem text required' });
    }

    const highlighted = UXOptimizationService.highlightVisualsAndLabs(stemText);

    res.json({
      success: true,
      data: { highlighted },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phase 4 Controller: Monetization
 */
export const getPredictiveImpactController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { currentAccuracy, targetAccuracy, subjectName, daysUntilExam } = req.body;

    if (currentAccuracy === undefined || targetAccuracy === undefined) {
      return res.status(400).json({ success: false, error: 'Missing accuracy values' });
    }

    const impact = MonetizationService.calculatePredictiveImpact(
      currentAccuracy,
      targetAccuracy,
      subjectName || 'General',
      daysUntilExam || 30
    );

    // Track conversion event
    await MonetizationService.trackConversionEvent(
      req.user?._id?.toString() || '',
      'feature_teaser_shown',
      'predictive_impact',
      {
        currentAccuracy: impact.currentPassProbability,
        projectedAccuracy: impact.projectedPassProbability,
        timesSaved: impact.timesSaved,
      }
    );

    res.json({
      success: true,
      data: impact,
    });
  } catch (error) {
    next(error);
  }
};

export const getFeatureTeaserController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { featureName } = req.params;

    if (!featureName) {
      return res.status(400).json({ success: false, error: 'Feature name required' });
    }

    const teaser = MonetizationService.getFeatureTeaser(featureName);

    // Track event
    await MonetizationService.trackConversionEvent(
      req.user?._id?.toString() || '',
      'feature_teaser_shown',
      featureName
    );

    res.json({
      success: true,
      data: teaser,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversionMetricsController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const daysBack = parseInt(req.query.daysBack as string) || 30;
    const metrics = await MonetizationService.getConversionMetrics(daysBack);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phase 4 Controller: Burnout Detection
 */
export const analyzeBurnoutRiskController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user?._id?.toString();

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User authentication required' });
    }

    const analysis = await BurnoutDetectionService.analyzeBurnoutRisk(userId);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
};

export const getWellnessSummaryController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user?._id?.toString();

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User authentication required' });
    }

    const summary = await BurnoutDetectionService.getWellnessSummary(userId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phase 4 Controller: Post-Exam Feedback
 */
export const submitPostExamFeedbackController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user?._id?.toString();
    const { examId, ...feedbackData } = req.body;

    if (!userId || !examId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const feedback = await PostExamFeedbackService.submitFeedback(userId, examId, feedbackData);

    res.json({
      success: true,
      data: feedback,
      message: 'Thank you for your feedback! This helps us improve.',
    });
  } catch (error) {
    next(error);
  }
};

export const getContentImprovementReportController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any
) => {
  try {
    const { examId } = req.params;

    if (!examId) {
      return res.status(400).json({ success: false, error: 'Exam ID required' });
    }

    const report = await PostExamFeedbackService.generateContentImprovementReport(examId);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phase 4 Controller: Multi-Exam Management
 */
export const getAvailableExamsController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const exams = await ExamManagementService.getAvailableExams();

    res.json({
      success: true,
      data: exams,
      count: exams.length,
    });
  } catch (error) {
    next(error);
  }
};

export const selectExamController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user?._id?.toString();
    const { examId, targetExamDate } = req.body;

    if (!userId || !examId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const selection = await ExamManagementService.selectExamForUser(userId, examId, targetExamDate);

    res.json({
      success: true,
      data: selection,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserExamsController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user?._id?.toString();

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User authentication required' });
    }

    const exams = await ExamManagementService.getUserExams(userId);

    res.json({
      success: true,
      data: exams,
    });
  } catch (error) {
    next(error);
  }
};

export const switchPrimaryExamController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user?._id?.toString();
    const { examId } = req.body;

    if (!userId || !examId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const updated = await ExamManagementService.switchPrimaryExam(userId, examId);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};