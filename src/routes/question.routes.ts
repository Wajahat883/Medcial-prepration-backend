import { Router } from 'express';
import { query } from 'express-validator';
import {
  getQuestions,
  getQuestion,
  getSubjects,
  getTopics,
  getRandomQuestions,
  getQuestionsByCategory,
} from '../controllers/question.controller';
import {
  createQuestionRevision,
  getQuestionRevisions,
  reviewRevision,
  publishRevision,
  archiveQuestion,
  getPendingReview,
  scheduleReReview,
  getQuestionsForReReview,
} from '../controllers/versioning.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Get all subjects (categories)
router.get('/subjects', authenticate, getSubjects);

// Get topics (subcategories) for a subject
router.get('/subjects/:id/topics', authenticate, getTopics);

// Get random questions
router.get(
  '/random',
  authenticate,
  validate([
    query('count').optional().isInt({ min: 1, max: 150 }),
    query('category').optional().trim(),
  ]),
  getRandomQuestions
);

// Get questions by category
router.get('/category/:category', authenticate, getQuestionsByCategory);

// Get all questions with filters
router.get(
  '/',
  authenticate,
  validate([
    query('category').optional().trim(),
    query('difficulty').optional().isIn(['easy', 'medium', 'hard']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  getQuestions
);

// Get single question
router.get('/:id', authenticate, getQuestion);

// ===== Question Versioning & Governance Routes (Phase 1) =====

// Create new version of a question
router.post('/:id/versions', authenticate, createQuestionRevision);

// Get full version history for a question
router.get('/:id/history', authenticate, getQuestionRevisions);

// Review a revision (approve/reject/needs_revision)
router.post('/revisions/:id/review', authenticate, reviewRevision);

// Publish an approved revision
router.post('/revisions/:id/publish', authenticate, publishRevision);

// Archive/retire a question
router.post('/:id/archive', authenticate, archiveQuestion);

// Schedule periodic re-review
router.post('/:id/schedule-review', authenticate, scheduleReReview);

// Get questions pending review (for content governance)
router.get('/admin/pending-review', authenticate, getPendingReview);

// Get questions due for re-review
router.get('/admin/due-review', authenticate, getQuestionsForReReview);

export default router;
