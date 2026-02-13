/**
 * Seeds Index - Entry point for database seeding
 */

export { subjectsData } from './subjects';
export { allSeedQuestions } from './seedData';
export { extendedQuestions } from './seedDataExtended';
export { part3Questions } from './seedDataPart3';
export { runSeed } from './runSeed';

// Combined export of all questions
import { allSeedQuestions } from './seedData';
import { extendedQuestions } from './seedDataExtended';
import { part3Questions } from './seedDataPart3';

export const allQuestions = [
  ...allSeedQuestions,
  ...extendedQuestions,
  ...part3Questions
];
