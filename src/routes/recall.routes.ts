import { Router } from 'express';
import { getRecallHeatmap, getHotTopics } from '../controllers/recall.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/heatmap', authenticate, getRecallHeatmap);
router.get('/hot-topics', authenticate, getHotTopics);

export default router;
