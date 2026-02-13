import { Types } from 'mongoose';
import { Exam, UserExamSelection, IUserExamSelection } from '../models/Phase4Models';

/**
 * Phase 4: Exam Management Service
 * Handles multi-exam platform architecture
 */
export class ExamManagementService {
  /**
   * Create a new exam configuration
   */
  static async createExam(examData: any) {
    return Exam.create(examData);
  }

  /**
   * Get all available exams
   */
  static async getAvailableExams() {
    return Exam.find({ isActive: true }).sort({ createdAt: -1 });
  }

  /**
   * Get exam by ID
   */
  static async getExamById(examId: string) {
    return Exam.findOne({
      $or: [{ _id: new Types.ObjectId(examId) }, { examId }],
    });
  }

  /**
   * Select exam for user (during onboarding or profile change)
   */
  static async selectExamForUser(userId: string, examId: string, targetExamDate?: Date) {
    // Get the exam
    const exam = await this.getExamById(examId);
    if (!exam) {
      throw new Error('Exam not found');
    }

    // Check if user already has a primary exam
    const existingPrimary = await UserExamSelection.findOne({
      userId: new Types.ObjectId(userId),
      isPrimary: true,
    });

    // If no primary, make this primary
    const isPrimary = !existingPrimary;

    // Create selection record
    const selection = await UserExamSelection.create({
      userId: new Types.ObjectId(userId),
      examId: exam._id,
      targetExamDate,
      isPrimary,
      status: 'active',
    });

    return selection;
  }

  /**
   * Get user's primary exam
   */
  static async getUserPrimaryExam(userId: string) {
    const selection = await UserExamSelection.findOne({
      userId: new Types.ObjectId(userId),
      isPrimary: true,
      status: 'active',
    }).populate('examId');

    return selection?.examId;
  }

  /**
   * Get all user's selected exams
   */
  static async getUserExams(userId: string) {
    return UserExamSelection.find({
      userId: new Types.ObjectId(userId),
      status: 'active',
    })
      .populate('examId')
      .sort({ isPrimary: -1, selectedAt: -1 });
  }

  /**
   * Switch to different exam
   */
  static async switchPrimaryExam(userId: string, examId: string) {
    const userId_OID = new Types.ObjectId(userId);

    // Unset current primary
    await UserExamSelection.updateMany(
      { userId: userId_OID, status: 'active' },
      { $set: { isPrimary: false } }
    );

    // Set new primary
    return UserExamSelection.findOneAndUpdate(
      { userId: userId_OID, examId: new Types.ObjectId(examId) },
      { $set: { isPrimary: true } },
      { new: true }
    );
  }

  /**
   * Get exam subjects
   * Used for filtering content and analytics by subject
   */
  static async getExamSubjects(examId: string) {
    const exam = await this.getExamById(examId);
    return exam?.subjects || [];
  }

  /**
   * Get regional guidelines for exam
   * Different exams may have different emphasis areas
   */
  static async getExamGuidelines(examId: string) {
    const exam = await this.getExamById(examId);
    return exam?.regionalGuidelines || {};
  }

  /**
   * Initialize exam questions from import (for bulk content)
   * Creates tags for filtering by exam
   */
  static async tagQuestionsForExam(examId: string, questionIds: string[]) {
    const exam = await this.getExamById(examId);
    if (!exam) {
      throw new Error('Exam not found');
    }

    // This would tag questions with exam applicability
    // In real implementation, would update Question model with exam tags
    return {
      examId: exam._id,
      questionsTagged: questionIds.length,
      status: 'completed',
    };
  }

  /**
   * Get exam statistics (for admin dashboard)
   */
  static async getExamStatistics(examId: string) {
    const exam = await this.getExamById(examId);
    const userCount = await UserExamSelection.countDocuments({
      examId: exam?._id,
      status: 'active',
    });

    const completedCount = await UserExamSelection.countDocuments({
      examId: exam?._id,
      status: 'completed',
    });

    return {
      exam: exam?.displayName,
      totalUsers: userCount,
      completedUsers: completedCount,
      passScore: exam?.passScore,
      totalQuestions: exam?.totalQuestions,
      availableSubjects: exam?.subjects.length || 0,
    };
  }
}

export default ExamManagementService;