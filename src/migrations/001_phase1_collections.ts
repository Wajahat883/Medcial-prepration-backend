import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/database';
import models from '../models';
import mongoose from 'mongoose';

dotenv.config();

const run = async () => {
  try {
    await connectDB();

    console.log('Starting Phase 1 migration: ensure collections and indexes');

    const names = Object.keys(models);
    for (const name of names) {
      const model = (models as any)[name];
      if (!model || !model.collection) continue;

      try {
        console.log(`- Initializing model ${name}`);
        // create collection if not exists
        try { await model.createCollection(); } catch (e) { /* ignore if exists */ }
        // ensure indexes defined on schema are built
        if (typeof model.init === 'function') {
          await model.init();
        }
        
        // Ensure all indexes are built on the collection
        const indexInfo = await model.collection.getIndexes();
        console.log(`  ✓ ${name} ready (${Object.keys(indexInfo).length} indexes)`);
      } catch (err) {
        console.warn(`  ! failed to init ${name}:`, err?.message || err);
      }
    }

    // Phase 1 specific indexes for performance
    console.log('\nEnsuring Phase 1 performance indexes...');

    // StudentPerformanceDetail indexes
    const StudentPerformanceDetail = models.StudentPerformanceDetail;
    if (StudentPerformanceDetail) {
      await StudentPerformanceDetail.collection.createIndex({ userId: 1, timestamp: -1 });
      await StudentPerformanceDetail.collection.createIndex({ userId: 1, category: 1, timestamp: -1 });
      await StudentPerformanceDetail.collection.createIndex({ userId: 1, isCorrect: 1, difficulty: 1 });
      console.log('  ✓ StudentPerformanceDetail indexes created');
    }

    // SessionToken indexes (for fast token validation)
    const SessionToken = models.SessionToken;
    if (SessionToken) {
      await SessionToken.collection.createIndex({ tokenId: 1 }, { unique: true });
      await SessionToken.collection.createIndex({ userId: 1, expiresAt: 1 });
      await SessionToken.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      console.log('  ✓ SessionToken indexes created');
    }

    // ContentViolationLog indexes for security tracking
    const ContentViolationLog = models.ContentViolationLog;
    if (ContentViolationLog) {
      await ContentViolationLog.collection.createIndex({ userId: 1, timestamp: -1 });
      await ContentViolationLog.collection.createIndex({ userId: 1, severity: 1 });
      await ContentViolationLog.collection.createIndex({ timestamp: -1 }); // For cleanup
      console.log('  ✓ ContentViolationLog indexes created');
    }

    // QuestionRevision indexes for versioning
    const QuestionRevision = models.QuestionRevision;
    if (QuestionRevision) {
      await QuestionRevision.collection.createIndex({ questionId: 1, versionNumber: 1 });
      await QuestionRevision.collection.createIndex({ questionId: 1, status: 1 });
      await QuestionRevision.collection.createIndex({ createdAt: -1 });
      console.log('  ✓ QuestionRevision indexes created');
    }

    // UserProgress indexes
    const UserProgress = models.UserProgress;
    if (UserProgress) {
      await UserProgress.collection.createIndex({ user: 1 });
      await UserProgress.collection.createIndex({ lastUpdated: -1 });
      console.log('  ✓ UserProgress indexes created');
    }

    // ReadinessScoreHistory indexes
    const ReadinessScoreHistory = models.ReadinessScoreHistory;
    if (ReadinessScoreHistory) {
      await ReadinessScoreHistory.collection.createIndex({ userId: 1, calculatedAt: -1 });
      await ReadinessScoreHistory.collection.createIndex({ userId: 1, score: 1 });
      console.log('  ✓ ReadinessScoreHistory indexes created');
    }

    // RecallIntelligence indexes
    const RecallIntelligence = models.RecallIntelligence;
    if (RecallIntelligence) {
      await RecallIntelligence.collection.createIndex({ userId: 1, topic: 1 });
      await RecallIntelligence.collection.createIndex({ frequency: -1, lastSeen: -1 });
      console.log('  ✓ RecallIntelligence indexes created');
    }

    // RevisionBucket indexes
    const RevisionBucket = models.RevisionBucket;
    if (RevisionBucket) {
      await RevisionBucket.collection.createIndex({ userId: 1, bucketType: 1 });
      await RevisionBucket.collection.createIndex({ userId: 1, createdAt: -1 });
      console.log('  ✓ RevisionBucket indexes created');
    }

    // UserCognitiveProfile indexes
    const UserCognitiveProfile = models.UserCognitiveProfile;
    if (UserCognitiveProfile) {
      await UserCognitiveProfile.collection.createIndex({ userId: 1 });
      console.log('  ✓ UserCognitiveProfile indexes created');
    }

    console.log('\n✅ Phase 1 migration complete - all collections and indexes ready');
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

if (require.main === module) run();
