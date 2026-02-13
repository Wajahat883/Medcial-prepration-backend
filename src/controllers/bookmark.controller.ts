import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { Bookmark } from '../models/Bookmark';
import { AppError } from '../middleware/errorHandler';

// @desc    Get all bookmarks
// @route   GET /api/bookmarks
// @access  Private
export const getBookmarks = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const queryObj: any = { user: req.user!._id };
    
    // If search is provided, we'll filter after populating
    let bookmarksQuery = Bookmark.find(queryObj)
      .populate({
        path: 'question',
        match: search ? {
          $or: [
            { questionText: { $regex: search, $options: 'i' } },
            { explanation: { $regex: search, $options: 'i' } },
          ],
        } : undefined,
      })
      .sort({ createdAt: -1 });

    const bookmarks = await bookmarksQuery.skip(skip).limit(limitNum);
    
    // Filter out bookmarks where question didn't match (if search was provided)
    const filteredBookmarks = search 
      ? bookmarks.filter(b => b.question !== null)
      : bookmarks;

    const total = await Bookmark.countDocuments(queryObj);

    res.json({
      success: true,
      data: filteredBookmarks,
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

// @desc    Add bookmark
// @route   POST /api/bookmarks
// @access  Private
export const addBookmark = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { questionId, notes = '' } = req.body;

    // Check if bookmark already exists
    const existingBookmark = await Bookmark.findOne({
      user: req.user!._id,
      question: questionId,
    });

    if (existingBookmark) {
      return next(new AppError('Question already bookmarked', 400));
    }

    const bookmark = await Bookmark.create({
      user: req.user!._id,
      question: questionId,
      notes,
    });

    await bookmark.populate('question');

    res.status(201).json({
      success: true,
      data: bookmark,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update bookmark (notes)
// @route   PUT /api/bookmarks/:id
// @access  Private
export const updateBookmark = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { notes } = req.body;

    const bookmark = await Bookmark.findOneAndUpdate(
      { _id: req.params.id, user: req.user!._id },
      { notes },
      { new: true }
    ).populate('question');

    if (!bookmark) {
      return next(new AppError('Bookmark not found', 404));
    }

    res.json({
      success: true,
      data: bookmark,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove bookmark
// @route   DELETE /api/bookmarks/:id
// @access  Private
export const removeBookmark = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const bookmark = await Bookmark.findOneAndDelete({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!bookmark) {
      return next(new AppError('Bookmark not found', 404));
    }

    res.json({
      success: true,
      message: 'Bookmark removed',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if question is bookmarked
// @route   GET /api/bookmarks/check/:questionId
// @access  Private
export const checkBookmark = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const { questionId } = req.params;

    const bookmark = await Bookmark.findOne({
      user: req.user!._id,
      question: questionId,
    });

    res.json({
      success: true,
      data: {
        isBookmarked: !!bookmark,
        bookmarkId: bookmark?._id || null,
      },
    });
  } catch (error) {
    next(error);
  }
};
