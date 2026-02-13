/**
 * AMC MCQ Exam Preparation Platform - Backend API
 * 
 * Main entry point for the server application
 */

import app from './app';

// Export the Express app for testing
export { app };

// Re-export commonly used modules
export * from './types';
export * from './models';
export * from './config/database';
export * from './utils/jwt';
export * from './utils/helpers';
export * from './middleware/auth';
export * from './middleware/errorHandler';
export * from './middleware/validate';

// Default export
export default app;
