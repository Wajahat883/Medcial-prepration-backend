import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { Question } from '../models/Question';
import { shuffleArray } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';

// @desc    Get all questions with filters
// @route   GET /api/questions
// @access  Private
export const getQuestions = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { category, difficulty, page = 1, limit = 20, search, subcategory } = req.query;

    // Build query
    const queryObj: any = { isActive: true };
    if (category) queryObj.category = category;
    if (subcategory) queryObj.subcategory = subcategory;
    if (difficulty) queryObj.difficulty = difficulty;
    if (search) {
      queryObj.$or = [
        { questionText: { $regex: search, $options: 'i' } },
        { explanation: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const questions = await Question.find(queryObj)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Question.countDocuments(queryObj);

    res.json({
      success: true,
      data: questions,
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

// @desc    Get single question
// @route   GET /api/questions/:id
// @access  Private
export const getQuestion = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return next(new AppError('Question not found', 404));
    }

    res.json({
      success: true,
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all subjects (categories)
// @route   GET /api/questions/subjects
// @access  Private
export const getSubjects = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const categories = await Question.distinct('category', { isActive: true });
    
    // Get subcategories and question count for each category
    const subjects = await Promise.all(
      categories.map(async (category) => {
        const subcategories = await Question.distinct('subcategory', {
          category,
          isActive: true,
        });
        const count = await Question.countDocuments({ category, isActive: true });
        return {
          id: category.toLowerCase().replace(/\s+/g, '-'),
          name: category,
          subcategories: subcategories.filter(Boolean),
          questionCount: count,
        };
      })
    );

    res.json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get topics (subcategories) for a subject
// @route   GET /api/questions/subjects/:id/topics
// @access  Private
export const getTopics = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { id } = req.params;
    
    // Convert ID back to category name (simple approach)
    // In production, you might want to store a mapping or use the actual category ID
    const allCategories = await Question.distinct('category', { isActive: true });
    const category = allCategories.find(cat => 
      cat.toLowerCase().replace(/\s+/g, '-') === id.toLowerCase()
    );

    if (!category) {
      return next(new AppError('Subject not found', 404));
    }

    // Get subcategories (topics) for this category
    const subcategories = await Question.distinct('subcategory', {
      category,
      isActive: true,
    });

    // Get details for each topic
    const topics = await Promise.all(
      subcategories.filter(Boolean).map(async (subcategory) => {
        const count = await Question.countDocuments({
          category,
          subcategory,
          isActive: true,
        });
        return {
          id: (subcategory as string).toLowerCase().replace(/\s+/g, '-'),
          name: subcategory,
          questionCount: count,
        };
      })
    );

    res.json({
      success: true,
      data: {
        subject: category,
        topics,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get random questions
// @route   GET /api/questions/random
// @access  Private
export const getRandomQuestions = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { count = 10, category } = req.query;
    const limit = Math.min(parseInt(count as string), 150);

    const queryObj: any = { isActive: true };
    if (category) queryObj.category = category;

    const questions = await Question.find(queryObj);
    const shuffled = shuffleArray(questions);
    const selected = shuffled.slice(0, limit);

    res.json({
      success: true,
      data: selected,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get questions by category
// @route   GET /api/questions/category/:category
// @access  Private
export const getQuestionsByCategory = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20, subcategory } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const queryObj: any = { category, isActive: true };
    if (subcategory) queryObj.subcategory = subcategory;

    const questions = await Question.find(queryObj)
      .skip(skip)
      .limit(limitNum);

    const total = await Question.countDocuments(queryObj);

    res.json({
      success: true,
      data: questions,
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
