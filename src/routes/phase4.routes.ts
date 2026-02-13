import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  logPiracyViolationController,
  getUserViolationsController,
  getWatermarkMetadataController,
  getUserUXPreferencesController,
  updateUXPreferencesController,
  highlightLabValuesController,
  getPredictiveImpactController,
  getFeatureTeaserController,
  getConversionMetricsController,
  analyzeBurnoutRiskController,
  getWellnessSummaryController,
  submitPostExamFeedbackController,
  getContentImprovementReportController,
  getAvailableExamsController,
  selectExamController,
  getUserExamsController,
  switchPrimaryExamController,
} from '../controllers/phase4.controller';

const router = Router();

/**
 * Phase 4: Anti-Piracy Routes
 */
router.post('/piracy/log-violation', authenticate, logPiracyViolationController);
router.get('/piracy/violations', authenticate, getUserViolationsController);
router.get('/piracy/watermark/:questionId', authenticate, getWatermarkMetadataController);

/**
 * Phase 4: UX Optimization Routes
 */
router.get('/ux/preferences', authenticate, getUserUXPreferencesController);
router.put('/ux/preferences', authenticate, updateUXPreferencesController);
router.post('/ux/highlight-labs', authenticate, highlightLabValuesController);

/**
 * Phase 4: Monetization Routes
 */
router.post('/monetization/predictive-impact', authenticate, getPredictiveImpactController);
router.get('/monetization/teaser/:featureName', authenticate, getFeatureTeaserController);
router.get('/monetization/metrics', authenticate, getConversionMetricsController);

/**
 * Phase 4: Burnout Detection Routes
 */
router.get('/wellness/burnout-analysis', authenticate, analyzeBurnoutRiskController);
router.get('/wellness/summary', authenticate, getWellnessSummaryController);

/**
 * Phase 4: Post-Exam Feedback Routes
 */
router.post('/feedback/post-exam', authenticate, submitPostExamFeedbackController);
router.get('/feedback/content-report/:examId', authenticate, getContentImprovementReportController);

/**
 * Phase 4: Multi-Exam Routes
 */
router.get('/exams/available', authenticate, getAvailableExamsController);
router.post('/exams/select', authenticate, selectExamController);
router.get('/exams/my-exams', authenticate, getUserExamsController);
router.post('/exams/switch-primary', authenticate, switchPrimaryExamController);

export default router;