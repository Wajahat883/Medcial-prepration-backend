import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { QuestionVersioningService } from '../services/question-versioning.service';
import { AppError } from '../middleware/errorHandler';

// POST /api/versioning/questions/:id/versions - Create new version
export const createQuestionRevision = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { id } = req.params;
    const { changes, changeLog, status = 'draft' } = req.body;
    const reviewerId = req.user!._id.toString();

    if (!changes || !changeLog) {
      return next(new AppError('Changes and changeLog are required', 400));
    }

    const revision = await QuestionVersioningService.createVersion(id, changes, reviewerId, changeLog, status);

    res.json({
      success: true,
      data: {
        revisionId: revision._id,
        versionNumber: revision.versionNumber,
        status: revision.status,
        changes: revision.changes,
        createdAt: revision.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/versioning/questions/:id/history - Get full version history
export const getQuestionRevisions = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { id } = req.params;

    const history = await QuestionVersioningService.getVersionHistory(id);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/versioning/revisions/:id/review - Review a revision
export const reviewRevision = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { id } = req.params;
    const { decision, feedback, nextStage } = req.body;
    const reviewerId = req.user!._id.toString();

    if (!decision) {
      return next(new AppError('Decision is required (approved|rejected|needs_revision)', 400));
    }

    const revision = await QuestionVersioningService.reviewVersion(
      id,
      reviewerId,
      decision,
      feedback || '',
      nextStage
    );

    res.json({
      success: true,
      data: {
        revisionId: revision._id,
        status: revision.status,
        decision,
        feedback,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/versioning/revisions/:id/publish - Publish approved revision
export const publishRevision = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { id } = req.params;
    const publisherId = req.user!._id.toString();

    const revision = await QuestionVersioningService.publishVersion(id, publisherId);

    res.json({
      success: true,
      data: {
        revisionId: revision._id,
        versionNumber: revision.versionNumber,
        status: 'published',
        publishedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/versioning/questions/:id/archive - Archive a question
export const archiveQuestion = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user!._id.toString();

    if (!reason) {
      return next(new AppError('Reason for archiving is required', 400));
    }

    const archived = await QuestionVersioningService.archiveQuestion(id, userId, reason);

    res.json({
      success: true,
      data: {
        questionId: archived._id,
        isArchived: true,
        archivedAt: archived.archivedAt,
        archiveReason: reason,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/versioning/pending-review - Get questions pending review
export const getPendingReview = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { stage = 'peer_review' } = req.query;

    const pending = await QuestionVersioningService.getPendingReview(stage as any);

    res.json({
      success: true,
      data: {
        stage,
        count: pending.length,
        revisions: pending,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/versioning/questions/:id/schedule-review - Schedule periodic re-review
export const scheduleReReview = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { id } = req.params;
    const { intervalDays = 90 } = req.body;

    const question = await QuestionVersioningService.scheduleReReview(id, intervalDays);

    res.json({
      success: true,
      data: {
        questionId: question._id,
        nextReReviewDate: question.nextReReviewDate,
        intervalDays,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/versioning/questions/due-review - Get questions due for re-review
export const getQuestionsForReReview = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const questions = await QuestionVersioningService.getQuestionsForReReview();

    res.json({
      success: true,
      data: {
        count: questions.length,
        questions: questions.map((q: any) => ({
          id: q._id,
          questionText: q.questionText,
          nextReReviewDate: q.nextReReviewDate,
          category: q.category,
          lastPublishedAt: q.lastPublishedAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// DEPRECATED ENDPOINTS (kept for compatibility)

// Restore a revision (apply to live question)
export const restoreQuestionRevision = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    return next(new AppError('Use POST /api/versioning/revisions/:id/publish instead', 410));
  } catch (error) {
    next(error);
  }
};

// Retire / archive a question
export const retireQuestion = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    return next(new AppError('Use POST /api/versioning/questions/:id/archive instead', 410));
  } catch (error) {
    next(error);
  }
};
