import cron from 'node-cron';
import mongoose from 'mongoose';
import { ReadinessCache } from '../models/ReadinessCache';
import { ReadinessScoreHistory } from '../models/ReadinessScoreHistory';
import { User } from '../models/User';
import { computeReadiness } from '../services/readiness.service';

// Run daily at 03:00 UTC
const SCHEDULE = '0 3 * * *';

export function startReadinessAggregator() {
  if (!process.env.ENABLE_READINESS_AGG || process.env.ENABLE_READINESS_AGG === 'false') {
    console.log('Readiness aggregator disabled via ENABLE_READINESS_AGG');
    return;
  }

  cron.schedule(SCHEDULE, async () => {
    console.log('Readiness aggregator starting...');
    try {
      const users = await User.find({}).select('_id').lean();
      for (const u of users) {
        try {
          const data = await computeReadiness(String(u._id));
          await ReadinessCache.findOneAndUpdate({ userId: u._id }, { score: data.overall_score, components: data.components, updatedAt: new Date() }, { upsert: true });
          await ReadinessScoreHistory.create({ userId: u._id, score: data.overall_score, components: data.components, calculatedAt: new Date() });
        } catch (err) {
          console.error('error computing readiness for user', u._id, err);
        }
      }
      console.log('Readiness aggregator completed');
    } catch (err) {
      console.error('Readiness aggregator failed', err);
    }
  });
}

// Allow manual start for testing
if (require.main === module) {
  startReadinessAggregator();
}
