// Export all models and their interfaces
export { User, IUserDocument } from "./User";
export { Question, IQuestionDocument } from "./Question";
export { TestSession, ITestSessionDocument } from "./TestSession";
export { Bookmark, IBookmarkDocument } from "./Bookmark";
export { UserProgress, IUserProgressDocument } from "./UserProgress";
export { Session, ISession } from "./Session";
export { QuestionRevision } from "./QuestionRevision";
export { QuestionMetadata } from "./QuestionMetadata";
export { StudentPerformanceDetail } from "./StudentPerformanceDetail";
export { RecallIntelligence } from "./RecallIntelligence";
export { SessionToken } from "./SessionToken";
export { ContentViolationLog } from "./ContentViolationLog";
export { ExplanationMetadata } from "./ExplanationMetadata";
export { UserCognitiveProfile } from "./UserCognitiveProfile";
export { ReadinessScoreHistory } from "./ReadinessScoreHistory";
export { RevisionBucket } from "./RevisionBucket";
export { QuestionContentGovernance } from "./QuestionContentGovernance";

// Export all models as a single object for convenience
import { User } from "./User";
import { Question } from "./Question";
import { TestSession } from "./TestSession";
import { Bookmark } from "./Bookmark";
import { UserProgress } from "./UserProgress";
import { Session } from "./Session";
import { QuestionRevision } from "./QuestionRevision";
import { QuestionMetadata } from "./QuestionMetadata";
import { StudentPerformanceDetail } from "./StudentPerformanceDetail";
import { RecallIntelligence } from "./RecallIntelligence";
import { SessionToken } from "./SessionToken";
import { ContentViolationLog } from "./ContentViolationLog";
import { ExplanationMetadata } from "./ExplanationMetadata";
import { UserCognitiveProfile } from "./UserCognitiveProfile";
import { ReadinessScoreHistory } from "./ReadinessScoreHistory";
import { RevisionBucket } from "./RevisionBucket";
import { QuestionContentGovernance } from "./QuestionContentGovernance";

export const models = {
  User,
  Question,
  TestSession,
  Bookmark,
  UserProgress,
  Session,
  QuestionRevision,
  QuestionMetadata,
  StudentPerformanceDetail,
  RecallIntelligence,
  SessionToken,
  ContentViolationLog,
  ExplanationMetadata,
  UserCognitiveProfile,
  ReadinessScoreHistory,
  RevisionBucket,
  QuestionContentGovernance,
};

export default models;
