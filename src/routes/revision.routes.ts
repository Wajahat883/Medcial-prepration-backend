import { Router } from 'express';
import { getRevisionBuckets, scheduleRevisionReminder } from '../controllers/revision.controller';
import { generateBuckets } from '../controllers/revision.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/buckets/:userId', authenticate, getRevisionBuckets);
router.post('/generate/:userId', authenticate, generateBuckets);
router.post('/reminders', authenticate, scheduleRevisionReminder);

export default router;
