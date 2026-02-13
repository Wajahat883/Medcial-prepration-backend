import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  analyzeErrorController,
  getCognitiveProfileController,
  getRevisionBucketsController,
  getRevisionScheduleController,
  getStructuredExplanationController,
  getExaminerFeedbackController,
  markQuestionsAsMasteredController,
} from '../controllers/ai.controller';

const router = Router();

/**
 * Phase 3: AI & Advanced Features API Routes
 */

/**
 * POST /api/ai/analyze-error
 * Analyzes a single error to determine error type and provide feedback
 * Body: { questionId, userAnswer, correctAnswer, timeTaken, explanation }
 */
router.post('/analyze-error', authenticate, analyzeErrorController);

/**
 * GET /api/ai/cognitive-profile
 * Get user's cognitive error patterns and clinical reasoning profile
 * Query: ?daysBack=30
 */
router.get('/cognitive-profile', authenticate, getCognitiveProfileController);

/**
 * GET /api/ai/revision-buckets
 * Get smart revision buckets for adaptive revision mode
 * Query: ?limit=100
 */
router.get('/revision-buckets', authenticate, getRevisionBucketsController);

/**
 * GET /api/ai/revision-schedule
 * Get adaptive revision schedule based on days until exam
 * Query: ?daysUntilExam=30
 */
router.get('/revision-schedule', authenticate, getRevisionScheduleController);

/**
 * GET /api/ai/explanations/:questionId
 * Get structured explanation with decision tree and visual aids
 */
router.get('/explanations/:questionId', authenticate, getStructuredExplanationController);

/**
 * POST /api/ai/examiner-feedback
 * Get examiner-style feedback for user's answer
 * Body: { questionId, userAnswer, correctAnswer }
 */
router.post('/examiner-feedback', authenticate, getExaminerFeedbackController);

/**
 * POST /api/ai/mark-mastered
 * Mark a question as mastered after 3 correct attempts
 * Body: { questionId }
 */
router.post('/mark-mastered', authenticate, markQuestionsAsMasteredController);

export default router;
