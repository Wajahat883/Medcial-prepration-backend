import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { RevisionBucket } from '../models/RevisionBucket';
import { generateRevisionBucketsForUser } from '../services/revision.service';

// GET /api/revision/buckets/:userId
export const getRevisionBuckets = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.params.userId === 'me' ? req.user!._id : req.params.userId;
    const buckets = await RevisionBucket.find({ userId }).sort({ priorityLevel: -1 }).lean();
    res.json({ success: true, data: buckets });
  } catch (error) {
    next(error);
  }
};

// POST /api/revision/generate/:userId
export const generateBuckets = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.params.userId === 'me' ? req.user!._id : req.params.userId;
    const created = await generateRevisionBucketsForUser(String(userId));
    res.json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

// POST /api/revision/reminders
export const scheduleRevisionReminder = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { userId, bucketId, remindAt } = req.body;
    // For now, just acknowledge — a background job/service should schedule notifications
    res.json({ success: true, message: 'Reminder scheduled (placeholder)', data: { userId, bucketId, remindAt } });
  } catch (error) {
    next(error);
  }
};
