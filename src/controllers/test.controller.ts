import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { TestSession } from '../models/TestSession';
import { Question } from '../models/Question';
import { UserProgress } from '../models/UserProgress';
import { shuffleArray, calculateScore } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';

// @desc    Create new test
// @route   POST /api/tests
// @access  Private
export const createTest = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { questionCount = 50, category, duration = 18000 } = req.body;

    // Get random questions
    const queryObj: any = { isActive: true };
    if (category) queryObj.category = category;

    const questions = await Question.find(queryObj);
    
    if (questions.length === 0) {
      return next(new AppError('No questions available', 400));
    }

    const shuffled = shuffleArray(questions);
    const selectedQuestions = shuffled.slice(0, Math.min(questionCount, questions.length));

    // Create test session
    const testSession = await TestSession.create({
      user: req.user!._id,
      questions: selectedQuestions.map(q => q._id),
      duration,
      category,
      answers: new Map(),
    });

    res.status(201).json({
      success: true,
      data: {
        id: testSession._id,
        questions: selectedQuestions,
        duration: testSession.duration,
        startTime: testSession.startTime,
        status: testSession.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get test session details
// @route   GET /api/tests/:id
// @access  Private
export const getTestSession = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const testSession = await TestSession.findOne({
      _id: req.params.id,
      user: req.user!._id,
    }).populate('questions');

    if (!testSession) {
      return next(new AppError('Test session not found', 404));
    }

    // Calculate time remaining
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - testSession.startTime.getTime()) / 1000);
    const timeRemaining = Math.max(0, testSession.duration - elapsed);

    res.json({
      success: true,
      data: {
        id: testSession._id,
        questions: testSession.questions,
        answers: Object.fromEntries(testSession.answers),
        startTime: testSession.startTime,
        duration: testSession.duration,
        timeRemaining,
        status: testSession.status,
        score: testSession.score,
        category: testSession.category,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit answer
// @route   POST /api/tests/:id/answer
// @access  Private
export const submitAnswer = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { questionIndex, answer } = req.body;

    const testSession = await TestSession.findOne({
      _id: req.params.id,
      user: req.user!._id,
      status: 'in_progress',
    });

    if (!testSession) {
      return next(new AppError('Test session not found or already completed', 404));
    }

    // Validate question index
    if (questionIndex < 0 || questionIndex >= testSession.questions.length) {
      return next(new AppError('Invalid question index', 400));
    }

    // Update answer
    testSession.answers.set(questionIndex.toString(), answer);
    await testSession.save();

    res.json({
      success: true,
      message: 'Answer submitted',
      data: {
        questionIndex,
        answer,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete test
// @route   POST /api/tests/:id/complete
// @access  Private
export const completeTest = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const testSession = await TestSession.findOne({
      _id: req.params.id,
      user: req.user!._id,
      status: 'in_progress',
    }).populate('questions');

    if (!testSession) {
      return next(new AppError('Test session not found or already completed', 404));
    }

    // Calculate score
    let correctCount = 0;
    const answers = testSession.answers;
    const questions = testSession.questions as any[];

    for (let i = 0; i < questions.length; i++) {
      const userAnswer = answers.get(i.toString());
      if (userAnswer !== undefined && userAnswer === questions[i].correctAnswer) {
        correctCount++;
      }
    }

    const score = calculateScore(correctCount, questions.length);

    // Update test session
    testSession.status = 'completed';
    testSession.endTime = new Date();
    testSession.score = score;
    await testSession.save();

    // Update user progress
    const userProgress = await UserProgress.findOne({ user: req.user!._id });
    if (userProgress) {
      userProgress.totalQuestionsAttempted += questions.length;
      userProgress.totalCorrectAnswers += correctCount;
      
      // Update category progress
      questions.forEach((q, index) => {
        const userAnswer = answers.get(index.toString());
        const isCorrect = userAnswer === q.correctAnswer;
        
        const catProgress = userProgress.categoryProgress.get(q.category) || { attempted: 0, correct: 0 };
        catProgress.attempted++;
        if (isCorrect) catProgress.correct++;
        userProgress.categoryProgress.set(q.category, catProgress);
      });

      // Update streak
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (userProgress.lastStudyDate) {
        const lastStudy = new Date(userProgress.lastStudyDate);
        lastStudy.setHours(0, 0, 0, 0);
        
        const diffDays = Math.floor((today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          // Consecutive day
          userProgress.streakDays += 1;
        } else if (diffDays > 1) {
          // Streak broken
          userProgress.streakDays = 1;
        }
      } else {
        userProgress.streakDays = 1;
      }
      
      userProgress.lastStudyDate = new Date();
      await userProgress.save();
    }

    const timeTaken = Math.floor((testSession.endTime.getTime() - testSession.startTime.getTime()) / 1000);

    res.json({
      success: true,
      data: {
        id: testSession._id,
        score,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        timeTaken,
        status: 'completed',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Abandon test
// @route   POST /api/tests/:id/abandon
// @access  Private
export const abandonTest = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const testSession = await TestSession.findOne({
      _id: req.params.id,
      user: req.user!._id,
      status: 'in_progress',
    });

    if (!testSession) {
      return next(new AppError('Test session not found', 404));
    }

    testSession.status = 'abandoned';
    testSession.endTime = new Date();
    await testSession.save();

    res.json({
      success: true,
      message: 'Test abandoned',
      data: {
        id: testSession._id,
        status: 'abandoned',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get test history
// @route   GET /api/tests/history
// @access  Private
export const getTestHistory = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const queryObj: any = {
      user: req.user!._id,
      status: { $in: ['completed', 'abandoned'] },
    };
    
    if (status && ['completed', 'abandoned'].includes(status as string)) {
      queryObj.status = status;
    }

    const tests = await TestSession.find(queryObj)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('questions', 'category');

    const total = await TestSession.countDocuments(queryObj);

    // Format the response
    const formattedTests = tests.map(test => ({
      id: test._id,
      status: test.status,
      score: test.score,
      totalQuestions: test.questions.length,
      duration: test.duration,
      timeTaken: test.endTime 
        ? Math.floor((test.endTime.getTime() - test.startTime.getTime()) / 1000)
        : null,
      category: test.category,
      createdAt: test.createdAt,
      completedAt: test.endTime,
    }));

    res.json({
      success: true,
      data: formattedTests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get test results
// @route   GET /api/tests/:id/results
// @access  Private
export const getTestResults = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const testSession = await TestSession.findOne({
      _id: req.params.id,
      user: req.user!._id,
      status: 'completed',
    }).populate('questions');

    if (!testSession) {
      return next(new AppError('Test results not found', 404));
    }

    const questions = testSession.questions as any[];
    const answers = testSession.answers;

    // Build detailed results
    const questionResults = questions.map((q, index) => {
      const userAnswer = answers.get(index.toString());
      return {
        question: {
          id: q._id,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          category: q.category,
          subcategory: q.subcategory,
          difficulty: q.difficulty,
        },
        userAnswer,
        isCorrect: userAnswer === q.correctAnswer,
      };
    });

    // Calculate category breakdown
    const categoryStats: Record<string, { attempted: number; correct: number }> = {};
    questionResults.forEach(result => {
      const cat = result.question.category;
      if (!categoryStats[cat]) {
        categoryStats[cat] = { attempted: 0, correct: 0 };
      }
      categoryStats[cat].attempted++;
      if (result.isCorrect) {
        categoryStats[cat].correct++;
      }
    });

    const timeTaken = Math.floor((testSession.endTime!.getTime() - testSession.startTime.getTime()) / 1000);

    res.json({
      success: true,
      data: {
        id: testSession._id,
        score: testSession.score,
        totalQuestions: questions.length,
        correctAnswers: questionResults.filter(r => r.isCorrect).length,
        incorrectAnswers: questionResults.filter(r => !r.isCorrect && r.userAnswer !== undefined).length,
        unanswered: questionResults.filter(r => r.userAnswer === undefined).length,
        timeTaken,
        duration: testSession.duration,
        category: testSession.category,
        completedAt: testSession.endTime,
        questionResults,
        categoryBreakdown: Object.entries(categoryStats).map(([category, stats]) => ({
          category,
          ...stats,
          accuracy: Math.round((stats.correct / stats.attempted) * 100),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
