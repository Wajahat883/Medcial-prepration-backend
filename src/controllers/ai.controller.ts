import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { UserCognitiveProfile } from '../models/UserCognitiveProfile';
import { Question } from '../models/Question';
import { CognitiveErrorAnalyzer } from '../services/cognitive-error-analyzer.service';
import { SmartRevisionService } from '../services/smart-revision.service';
import { ExplanationStructurer } from '../services/explanation-structurer.service';

/**
 * Phase 3 AI Controller Methods
 * Handles cognitive analysis, revision planning, and structured explanations
 */

/**
 * POST /api/ai/analyze-error
 * Analyzes a single error to determine error type and provide feedback
 */
export const analyzeErrorController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { questionId, userAnswer, correctAnswer, timeTaken, explanation } = req.body;
    const userId = req.user?._id?.toString();

    if (!userId || !questionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId and questionId are required' 
      });
    }

    const analysis = await CognitiveErrorAnalyzer.analyzeError(
      userId,
      questionId,
      userAnswer || '',
      correctAnswer || '',
      timeTaken || 0,
      explanation || ''
    );

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ai/cognitive-profile
 * Get user's cognitive error patterns and clinical reasoning profile
 */
export const getCognitiveProfileController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user?._id?.toString();
    const daysBack = parseInt(req.query.daysBack as string) || 30;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User authentication required' 
      });
    }

    // Get cached profile first
    let profile = await UserCognitiveProfile.findOne({ userId }).lean();

    if (!profile) {
      // Generate fresh profile from recent performance data
      profile = await CognitiveErrorAnalyzer.analyzeClinicalPatterns(userId, daysBack);
      
      // Cache the profile
      await UserCognitiveProfile.create({
        userId,
        patterns: profile.patterns,
        stretchAreas: profile.stretchAreas,
        strengthAreas: profile.strengthAreas,
        recommendations: profile.recommendations,
        lastUpdatedAt: new Date(),
      } as any);
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ai/revision-buckets
 * Get smart revision buckets for adaptive revision mode
 */
export const getRevisionBucketsController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user?._id?.toString();
    const limit = parseInt(req.query.limit as string) || 100;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User authentication required' 
      });
    }

    const buckets = await SmartRevisionService.generateRevisionBuckets(userId, limit);

    res.json({
      success: true,
      data: buckets,
      message: `Generated ${Object.keys(buckets).length} revision bucket types`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ai/revision-schedule
 * Get adaptive revision schedule based on days until exam
 */
export const getRevisionScheduleController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user?._id?.toString();
    const daysUntilExam = parseInt(req.query.daysUntilExam as string) || 30;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User authentication required' 
      });
    }

    if (daysUntilExam < 1 || daysUntilExam > 365) {
      return res.status(400).json({ 
        success: false, 
        error: 'daysUntilExam must be between 1 and 365' 
      });
    }

    const schedule = await SmartRevisionService.getRevisionSchedule(userId, daysUntilExam);

    res.json({
      success: true,
      data: schedule,
      daysUntilExam,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ai/explanations/:questionId
 * Get structured explanation with decision tree and visual aids
 */
export const getStructuredExplanationController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { questionId } = req.params;

    if (!questionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Question ID required' 
      });
    }

    const explanation = await ExplanationStructurer.getStructuredExplanation(questionId);

    if (!explanation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Explanation not found for this question' 
      });
    }

    // Build decision tree from sections
    const decisionTree = ExplanationStructurer.buildDecisionTree(explanation.sections);

    res.json({
      success: true,
      data: {
        ...explanation,
        decisionTree,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/ai/examiner-feedback
 * Get examiner-style feedback for user's answer
 */
export const getExaminerFeedbackController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { questionId, userAnswer, correctAnswer } = req.body;

    if (!questionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Question ID required' 
      });
    }

    // Get question for context
    const question = await Question.findById(questionId).lean();
    if (!question) {
      return res.status(404).json({ 
        success: false, 
        error: 'Question not found' 
      });
    }

    // Get structured explanation
    const explanation = await ExplanationStructurer.getStructuredExplanation(questionId);
    if (!explanation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Explanation not found for this question' 
      });
    }

    // Generate feedback
    const feedback = ExplanationStructurer.generateExaminerFeedback(
      userAnswer || '',
      correctAnswer || '',
      explanation.sections
    );

    res.json({
      success: true,
      data: {
        feedback,
        examinerPerspective: true,
        questionId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/ai/mark-mastered
 * Mark a question as mastered after 3 correct attempts
 */
export const markQuestionsAsMasteredController = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { questionId } = req.body;
    const userId = req.user?._id?.toString();

    if (!userId || !questionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId and questionId are required' 
      });
    }

    await SmartRevisionService.markQuestionMastered(userId, questionId);

    res.json({
      success: true,
      message: 'Question marked as mastered and removed from revision buckets',
      questionId,
    });
  } catch (error) {
    next(error);
  }
};

// Legacy controller exports (kept for backward compatibility)
export const categorizeErrorController = analyzeErrorController;
export const getCognitiveProfile = getCognitiveProfileController;
