import { Request, Response, NextFunction } from 'express';

/**
 * Custom application error class
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  status: string;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle specific MongoDB errors
 */
const handleCastErrorDB = (err: any): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err: any): AppError => {
  const value = err.errmsg?.match(/"([^"]*)"/)?.[0] || 'value';
  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err: any): AppError => {
  const errors = Object.values(err.errors).map((val: any) => val.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = (): AppError => {
  return new AppError('Your token has expired. Please log in again.', 401);
};

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err as AppError;
  
  error.message = err.message;

  // Log error
  console.error('Error:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    statusCode: (error as AppError).statusCode,
    path: req.path,
    method: req.method,
  });

  // Handle specific error types
  if (error.name === 'CastError') {
    error = handleCastErrorDB(error);
  }

  if (error.name === 'MongoServerError' && (error as any).code === 11000) {
    error = handleDuplicateFieldsDB(error);
  }

  if (error.name === 'ValidationError') {
    error = handleValidationErrorDB(error);
  }

  if (error.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }

  if (error.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Mongoose connection errors
  if (error.name === 'MongooseServerSelectionError') {
    error = new AppError('Database connection failed. Please try again later.', 503);
  }

  const statusCode = (error as AppError).statusCode || 500;
  const status = (error as AppError).status || 'error';
  const message = error.message || 'Internal Server Error';

  // Send response
  res.status(statusCode).json({
    success: false,
    status,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      errorObj: err,
    }),
  });
};

/**
 * Async handler wrapper to catch errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};
