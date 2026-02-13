import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { RecallIntelligence } from '../models/RecallIntelligence';
import { Question } from '../models/Question';

// GET /api/recall/heatmap
export const getRecallHeatmap = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { days = 90 } = req.query;
    // Simple aggregation: return topics ordered by recallFrequency
    const data = await RecallIntelligence.find()
      .sort({ recallFrequency: -1 })
      .limit(100)
      .lean();

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/recall/hot-topics
export const getHotTopics = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { limit = 10 } = req.query;
    const topics = await RecallIntelligence.find()
      .sort({ last30DaysCount: -1 })
      .limit(parseInt(limit as string))
      .lean();

    res.json({ success: true, data: topics });
  } catch (error) {
    next(error);
  }
};
