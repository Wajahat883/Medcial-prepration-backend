import { Router } from 'express';
import { body } from 'express-validator';
import {
  createTest,
  getTestSession,
  submitAnswer,
  completeTest,
  abandonTest,
  getTestHistory,
  getTestResults,
} from '../controllers/test.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Get test history
router.get('/history', authenticate, getTestHistory);

// Create new test
router.post(
  '/',
  authenticate,
  validate([
    body('questionCount').optional().isInt({ min: 1, max: 150 }),
    body('category').optional().trim(),
    body('duration').optional().isInt({ min: 600, max: 36000 }),
  ]),
  createTest
);

// Get test session details
router.get('/:id', authenticate, getTestSession);

// Submit answer
router.post(
  '/:id/answer',
  authenticate,
  validate([
    body('questionIndex').isInt({ min: 0 }),
    body('answer').isInt({ min: 0, max: 4 }),
  ]),
  submitAnswer
);

// Complete test
router.post('/:id/complete', authenticate, completeTest);

// Abandon test
router.post('/:id/abandon', authenticate, abandonTest);

// Get test results
router.get('/:id/results', authenticate, getTestResults);

export default router;
