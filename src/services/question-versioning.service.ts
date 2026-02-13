import mongoose from 'mongoose';
import { Question } from '../models/Question';
import { QuestionRevision } from '../models/QuestionRevision';
import { QuestionContentGovernance } from '../models/QuestionContentGovernance';
import { IQuestion } from '../types';

interface IVersionDiff {
  field: string;
  oldValue: any;
  newValue: any;
}

export class QuestionVersioningService {
  /**
   * Create a new version of a question
   */
  static async createVersion(
    questionId: string,
    changes: Partial<IQuestion>,
    reviewerId: string,
    changeLog: string,
    status: 'draft' | 'peer_review' | 'senior_review' | 'published' = 'draft'
  ) {
    const question = await Question.findById(questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    // Calculate diffs
    const diffs = this.calculateDiffs(
      question.toObject(),
      changes as any
    );

    // Create revision record
    const revision = await QuestionRevision.create({
      questionId: new mongoose.Types.ObjectId(questionId),
      changeDescription: changeLog,
      createdBy: new mongoose.Types.ObjectId(reviewerId),
      status,
      content: JSON.stringify(changes),
      revisionId: `${questionId}-${Date.now()}`,
    });

    // Create governance record for audit trail
    await QuestionContentGovernance.create({
      questionId: new mongoose.Types.ObjectId(questionId),
      revisionId: revision._id,
      stage: status,
      reviewer: new mongoose.Types.ObjectId(reviewerId),
      decision: 'created',
      feedback: changeLog,
      timestamp: new Date(),
    });

    return revision;
  }

  /**
   * Review a question's version
   */
  static async reviewVersion(
    revisionId: string,
    reviewerId: string,
    decision: 'approved' | 'rejected' | 'needs_revision',
    feedback: string,
    nextStageIfApproved?: 'peer_review' | 'senior_review' | 'published'
  ) {
    const revision = await QuestionRevision.findByIdAndUpdate(
      revisionId,
      {
        status: decision === 'approved' && nextStageIfApproved ? nextStageIfApproved : decision,
        rejectionReason: decision === 'rejected' ? feedback : undefined,
      },
      { new: true }
    );

    if (!revision) {
      throw new Error(`Revision ${revisionId} not found`);
    }

    // Create governance audit record
    await QuestionContentGovernance.create({
      questionId: revision.questionId,
      revisionId: revision._id,
      stage: revision.status,
      reviewer: new mongoose.Types.ObjectId(reviewerId),
      decision,
      feedback,
      timestamp: new Date(),
    });

    return revision;
  }

  /**
   * Publish an approved question version
   */
  static async publishVersion(
    revisionId: string,
    publishById: string
  ) {
    const revision = await QuestionRevision.findById(revisionId);
    if (!revision) {
      throw new Error(`Revision ${revisionId} not found`);
    }

    if (revision.status !== 'published') {
      throw new Error(`Cannot publish revision with status: ${revision.status}`);
    }

    // Update the question with new version data
    const question = await Question.findById(revision.questionId);
    if (!question) {
      throw new Error(`Question ${revision.questionId} not found`);
    }

    // Apply changes from revision
    const updates: any = {};
    try {
      const changes = JSON.parse(revision.content || '{}');
      Object.assign(updates, changes);
    } catch (e) {
      // Content is not JSON, skip parsing
    }

    updates.lastPublishedAt = new Date();
    updates.lastPublishedByRevisionId = revision._id;

    await Question.findByIdAndUpdate(question._id, updates);

    // Log in governance
    await QuestionContentGovernance.create({
      questionId: revision.questionId,
      revisionId: revision._id,
      stage: 'published',
      reviewer: new mongoose.Types.ObjectId(publishById),
      decision: 'published',
      feedback: `Revision ${revision.revisionId} published`,
      timestamp: new Date(),
    });

    return revision;
  }

  /**
   * Archive or retire a question
   */
  static async archiveQuestion(
    questionId: string,
    archivedBy: string,
    reason: string
  ) {
    const update = await Question.findByIdAndUpdate(
      questionId,
      {
        isActive: false,
        isArchived: true,
        archiveReason: reason,
        archivedAt: new Date(),
        archivedBy: new mongoose.Types.ObjectId(archivedBy),
      },
      { new: true }
    );

    if (!update) {
      throw new Error(`Question ${questionId} not found`);
    }

    // Log archival
    await QuestionContentGovernance.create({
      questionId: new mongoose.Types.ObjectId(questionId),
      stage: 'archived',
      reviewer: new mongoose.Types.ObjectId(archivedBy),
      decision: 'archived',
      feedback: reason,
      timestamp: new Date(),
    });

    return update;
  }

  /**
   * Get full version history for a question
   */
  static async getVersionHistory(questionId: string) {
    const revisions = await QuestionRevision.find({
      questionId: new mongoose.Types.ObjectId(questionId),
    })
      .sort({ createdAt: -1 })
      .populate('changedBy', 'email name');

    const governance = await QuestionContentGovernance.find({
      questionId: new mongoose.Types.ObjectId(questionId),
    })
      .sort({ timestamp: -1 })
      .populate('reviewer', 'email name');

    return {
      revisions,
      governance,
      auditTrail: governance.map((g: any) => ({
        timestamp: g.timestamp,
        reviewer: g.reviewer,
        decision: g.decision,
        feedback: g.feedback,
        stage: g.stage,
      })),
    };
  }

  /**
   * Get questions pending review
   */
  static async getPendingReview(stage: 'peer_review' | 'senior_review' | 'medical_editor') {
    return QuestionRevision.find({ status: stage })
      .populate('questionId', 'questionText')
      .populate('changedBy', 'email name')
      .sort({ createdAt: 1 });
  }

  /**
   * Calculate field-by-field differences
   */
  private static calculateDiffs(oldData: any, newData: any): IVersionDiff[] {
    const diffs: IVersionDiff[] = [];

    const allKeys = new Set([
      ...Object.keys(oldData),
      ...Object.keys(newData),
    ]);

    allKeys.forEach((key) => {
      if (
        key === '_id' ||
        key === '__v' ||
        key === 'createdAt' ||
        key === 'updatedAt'
      ) {
        return; // Skip system fields
      }

      const oldVal = oldData[key];
      const newVal = newData[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diffs.push({
          field: key,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    });

    return diffs;
  }

  /**
   * Schedule periodic re-review for high-yield questions
   */
  static async scheduleReReview(
    questionId: string,
    intervalDays: number = 90
  ) {
    const question = await Question.findByIdAndUpdate(
      questionId,
      {
        nextReReviewDate: new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000),
        reviewScheduled: true,
      },
      { new: true }
    );

    return question;
  }

  /**
   * Get questions due for re-review
   */
  static async getQuestionsForReReview() {
    return Question.find({
      nextReReviewDate: { $lte: new Date() },
      reviewScheduled: true,
      isActive: true,
    }).sort({ nextReReviewDate: 1 });
  }
}
