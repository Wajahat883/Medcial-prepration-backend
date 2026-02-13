import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getBookmarks,
  addBookmark,
  removeBookmark,
  updateBookmark,
  checkBookmark,
} from '../controllers/bookmark.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Get all bookmarks
router.get('/', authenticate, getBookmarks);

// Check if question is bookmarked
router.get(
  '/check/:questionId',
  authenticate,
  validate([
    param('questionId').isMongoId().withMessage('Valid question ID is required'),
  ]),
  checkBookmark
);

// Add bookmark
router.post(
  '/',
  authenticate,
  validate([
    body('questionId').isMongoId().withMessage('Valid question ID is required'),
    body('notes').optional().trim(),
  ]),
  addBookmark
);

// Update bookmark notes
router.put(
  '/:id',
  authenticate,
  validate([
    param('id').isMongoId().withMessage('Valid bookmark ID is required'),
    body('notes').optional().trim(),
  ]),
  updateBookmark
);

// Remove bookmark
router.delete(
  '/:id',
  authenticate,
  validate([
    param('id').isMongoId().withMessage('Valid bookmark ID is required'),
  ]),
  removeBookmark
);

export default router;
