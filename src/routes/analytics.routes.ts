import { Router } from 'express';
import { 
  getDashboardStats, 
  getPerformanceByCategory, 
  getStudyStreak, 
  getProgressOverTime,
  getScorePrediction,
  trackAttempt,
  getPerformanceMetrics,
  getCognitiveProfile,
  getPerformanceTrends,
  getDifficultyWeightedMetrics,
  getCognitiveErrors,
  getRecallHeatmap,
  getHotTopics,
} from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Original endpoints
router.get('/overview', authenticate, getDashboardStats);
router.get('/subjects', authenticate, getPerformanceByCategory);
router.get('/study-streak', authenticate, getStudyStreak);
router.get('/trends', authenticate, getProgressOverTime);
router.get('/predictions', authenticate, getScorePrediction);
router.post('/track-attempt', authenticate, trackAttempt);

// Phase 1 new endpoints
router.get('/performance/metrics', authenticate, getPerformanceMetrics);
router.get('/cognitive-profile', authenticate, getCognitiveProfile);
router.get('/performance-trends', authenticate, getPerformanceTrends);
router.get('/difficulty-weighted', authenticate, getDifficultyWeightedMetrics);

// Phase 2 new endpoints
router.get('/cognitive-errors', authenticate, getCognitiveErrors);
router.get('/recall-heatmap', authenticate, getRecallHeatmap);
router.get('/hot-topics', authenticate, getHotTopics);

export default router;
