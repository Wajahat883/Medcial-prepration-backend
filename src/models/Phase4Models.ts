import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Phase 4: Exam Configuration Model
 * Supports multi-exam platform architecture
 */
export interface IExam extends Document {
  _id: Types.ObjectId;
  examId: string; // e.g., "amc-mcq", "plab-1", "usmle-ck"
  displayName: string;
  description?: string;
  passScore: number;
  totalQuestions: number;
  timeLimit: number; // in minutes
  subjects: string[];
  regionalGuidelines?: Record<string, any>;
  contentLanguages: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
  {
    examId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    description: String,
    passScore: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    timeLimit: { type: Number, required: true },
    subjects: [String],
    regionalGuidelines: Schema.Types.Mixed,
    contentLanguages: { type: [String], default: ['en'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Exam = mongoose.model<IExam>('Exam', ExamSchema);

/**
 * Phase 4: User Exam Selection
 * Tracks which exam each user is preparing for
 */
export interface IUserExamSelection extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  examId: Types.ObjectId;
  targetExamDate?: Date;
  selectedAt: Date;
  isPrimary: boolean;
  status: 'active' | 'paused' | 'completed';
}

const UserExamSelectionSchema = new Schema<IUserExamSelection>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    targetExamDate: Date,
    selectedAt: { type: Date, default: Date.now },
    isPrimary: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
  },
  { timestamps: true }
);

UserExamSelectionSchema.index({ userId: 1, isPrimary: 1 });

export const UserExamSelection = mongoose.model<IUserExamSelection>(
  'UserExamSelection',
  UserExamSelectionSchema
);

/**
 * Phase 4: Post-Exam Feedback
 * Captures user feedback after exam attempt
 */
export interface IPostExamFeedback extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  examId: Types.ObjectId;
  testSessionId?: Types.ObjectId;
  unfamiliarTopics: string[];
  perceivedDifficulty: 'easy' | 'medium' | 'hard';
  actualPerformance: number; // percentage
  examExperience: {
    timePressure: number; // 1-5 scale
    clarity: number; // 1-5 scale
    difficulty: number; // 1-5 scale
  };
  feedback: string; // free text
  submittedAt: Date;
  createdAt: Date;
}

const PostExamFeedbackSchema = new Schema<IPostExamFeedback>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    testSessionId: { type: Schema.Types.ObjectId, ref: 'TestSession' },
    unfamiliarTopics: [String],
    perceivedDifficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    actualPerformance: Number,
    examExperience: {
      timePressure: Number,
      clarity: Number,
      difficulty: Number,
    },
    feedback: String,
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PostExamFeedback = mongoose.model<IPostExamFeedback>(
  'PostExamFeedback',
  PostExamFeedbackSchema
);

/**
 * Phase 4: User Study Preferences (UX Optimization)
 * Stores user's cognitive load and UX preferences
 */
export interface IUserUXPreferences extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  noiseReductionEnabled: boolean;
  autoCollapseStems: boolean;
  highlightVitalsAndLabs: boolean;
  fontSize: 'small' | 'normal' | 'large';
  theme: 'light' | 'dark';
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserUXPreferencesSchema = new Schema<IUserUXPreferences>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    noiseReductionEnabled: { type: Boolean, default: false },
    autoCollapseStems: { type: Boolean, default: false },
    highlightVitalsAndLabs: { type: Boolean, default: true },
    fontSize: { type: String, enum: ['small', 'normal', 'large'], default: 'normal' },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    soundEnabled: { type: Boolean, default: true },
    notificationsEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const UserUXPreferences = mongoose.model<IUserUXPreferences>(
  'UserUXPreferences',
  UserUXPreferencesSchema
);

/**
 * Phase 4: Burnout Detection & Wellness Tracking
 * Monitors study patterns and detects burnout risk
 */
export interface IUserWellness extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  lastSevenDaysAccuracy: number[];
  lastSevenDaysSessionDuration: number[];
  lastSevenDaysSessionFrequency: number;
  burnoutRiskLevel: 'low' | 'medium' | 'high';
  declineIndicators: {
    accuracyDeclining: boolean;
    timeDeclining: boolean;
    frequencyDeclining: boolean;
  };
  interventionsSent: Array<{
    type: string;
    message: string;
    sentAt: Date;
  }>;
  recommendedAction?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserWellnessSchema = new Schema<IUserWellness>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    lastSevenDaysAccuracy: [Number],
    lastSevenDaysSessionDuration: [Number],
    lastSevenDaysSessionFrequency: { type: Number, default: 0 },
    burnoutRiskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    declineIndicators: {
      accuracyDeclining: Boolean,
      timeDeclining: Boolean,
      frequencyDeclining: Boolean,
    },
    interventionsSent: [
      {
        type: String,
        message: String,
        sentAt: Date,
      },
    ],
    recommendedAction: String,
  },
  { timestamps: true }
);

export const UserWellness = mongoose.model<IUserWellness>('UserWellness', UserWellnessSchema);

/**
 * Phase 4: Piracy Protection
 * Tracks copy/paste/screenshot attempts and violations
 */
export interface IPiracyViolation extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  violationType: 'copy' | 'paste' | 'screenshot' | 'context-menu' | 'suspicious-access';
  questionId: Types.ObjectId;
  sessionId: string;
  deviceInfo: {
    userAgent: string;
    ipAddress: string;
  };
  severity: 'low' | 'medium' | 'high';
  automcDescription: string;
  isReviewed: boolean;
  adminNotes?: string;
  createdAt: Date;
}

const PiracyViolationSchema = new Schema<IPiracyViolation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    violationType: {
      type: String,
      enum: ['copy', 'paste', 'screenshot', 'context-menu', 'suspicious-access'],
      required: true,
    },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
    sessionId: { type: String, index: true },
    deviceInfo: {
      userAgent: String,
      ipAddress: String,
    },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    automcDescription: String,
    isReviewed: { type: Boolean, default: false },
    adminNotes: String,
  },
  { timestamps: true }
);

PiracyViolationSchema.index({ userId: 1, createdAt: -1 });

export const PiracyViolation = mongoose.model<IPiracyViolation>('PiracyViolation', PiracyViolationSchema);

/**
 * Phase 4: Monetization Tracking
 * Tracks conversion events and upsell performance
 */
export interface IConversionEvent extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  eventType:
    | 'feature_teaser_shown'
    | 'premium_feature_viewed'
    | 'upsell_clicked'
    | 'subscription_attempted'
    | 'subscription_completed';
  featureName: string;
  impactShown?: {
    currentAccuracy: number;
    projectedAccuracy: number;
    timesSaved: number;
  };
  upsellVariant?: string;
  conversionRate?: number;
  createdAt: Date;
}

const ConversionEventSchema = new Schema<IConversionEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventType: {
      type: String,
      enum: [
        'feature_teaser_shown',
        'premium_feature_viewed',
        'upsell_clicked',
        'subscription_attempted',
        'subscription_completed',
      ],
      required: true,
    },
    featureName: { type: String, required: true },
    impactShown: {
      currentAccuracy: Number,
      projectedAccuracy: Number,
      timesSaved: Number,
    },
    upsellVariant: String,
    conversionRate: Number,
  },
  { timestamps: true }
);

export const ConversionEvent = mongoose.model<IConversionEvent>(
  'ConversionEvent',
  ConversionEventSchema
);