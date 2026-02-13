import { Router } from 'express';
import {
  getReadinessScore,
  getReadinessBreakdown,
  getReadinessHistory,
  getReadinessTrends,
  getReadinessReport,
} from '../controllers/readiness.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get current readiness score with components
router.get('/score/:userId', authenticate, getReadinessScore);

// Get readiness component breakdown
router.get('/breakdown/:userId', authenticate, getReadinessBreakdown);

// Get historical readiness scores (trends data)
router.get('/history/:userId', authenticate, getReadinessHistory);

// Get readiness score trends with analytics
router.get('/trends/:userId', authenticate, getReadinessTrends);

// Get comprehensive readiness report with metrics and recommendations
router.get('/report/:userId', authenticate, getReadinessReport);

export default router;
