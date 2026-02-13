import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, body, param, query } from 'express-validator';
import { AppError } from './errorHandler';

/**
 * Run validations and handle errors
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map(err => ({
      field: err.type === 'field' ? err.path : err.type,
      message: err.msg,
      value: err.type === 'field' ? err.value : undefined,
    }));

    const errorMessage = extractedErrors.map(err => err.message).join('; ');
    
    next(new AppError(errorMessage, 400));
  };
};

/**
 * Common validation chains
 */
export const commonValidations = {
  // Pagination
  page: query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  limit: query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  // MongoDB ObjectId
  mongoId: (field: string, location: 'param' | 'body' = 'param') => {
    const validator = location === 'param' ? param(field) : body(field);
    return validator.isMongoId().withMessage(`Invalid ${field} format`);
  },
  
  // Email
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  // Password
  password: body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  // Name
  firstName: body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  
  lastName: body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  
  // Question answer
  questionIndex: body('questionIndex')
    .isInt({ min: 0 })
    .withMessage('Question index must be a non-negative integer'),
  
  answer: body('answer')
    .isInt({ min: 0, max: 4 })
    .withMessage('Answer must be between 0 and 4'),
  
  // Test configuration
  questionCount: body('questionCount')
    .optional()
    .isInt({ min: 1, max: 150 })
    .withMessage('Question count must be between 1 and 150'),
  
  duration: body('duration')
    .optional()
    .isInt({ min: 600, max: 36000 })
    .withMessage('Duration must be between 600 and 36000 seconds'),
  
  // Category and difficulty
  category: body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters'),
  
  difficulty: body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  
  // Notes
  notes: body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
};

/**
 * Sanitize middleware - removes dangerous characters
 */
export const sanitize = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize string fields in body
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key]
          .replace(/[<>]/g, '')
          .trim();
      }
    });
  }
  
  next();
};
