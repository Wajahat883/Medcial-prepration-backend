import mongoose, { Schema, Document } from "mongoose";
import { ITestSession } from "../types";

export interface ITestSessionDocument extends ITestSession, Document {
  // Add any instance methods here
  getAnsweredCount(): number;
  getUnansweredCount(): number;
  getTimeRemaining(): number;
}

const testSessionSchema = new Schema<ITestSessionDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    questions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Question",
        required: true,
      },
    ],
    answers: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    startTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      default: 18000, // 5 hours in seconds (AMC exam duration)
      min: [60, "Duration must be at least 60 seconds"],
      max: [86400, "Duration cannot exceed 24 hours"],
    },
    status: {
      type: String,
      enum: {
        values: ["in_progress", "completed", "abandoned"],
        message: "Status must be in_progress, completed, or abandoned",
      },
      default: "in_progress",
      index: true,
    },
    score: {
      type: Number,
      default: null,
      min: [0, "Score must be at least 0"],
      max: [100, "Score cannot exceed 100"],
    },
    category: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
// Index for querying user's test history
testSessionSchema.index({ user: 1, status: 1, createdAt: -1 });
// Index for finding in-progress tests
testSessionSchema.index({ user: 1, status: 1 });
// Index for date range queries
testSessionSchema.index({ endTime: 1, status: 1 });

// Virtual for answered count
testSessionSchema.virtual("answeredCount").get(function () {
  return this.answers.size;
});

// Virtual for unanswered count
testSessionSchema.virtual("unansweredCount").get(function () {
  return this.questions.length - this.answers.size;
});

// Virtual for time remaining
testSessionSchema.virtual("timeRemaining").get(function () {
  if (this.status !== "in_progress") return 0;
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
  return Math.max(0, this.duration - elapsed);
});

// Virtual for progress percentage
testSessionSchema.virtual("progressPercentage").get(function () {
  if (this.questions.length === 0) return 0;
  return Math.round((this.answers.size / this.questions.length) * 100);
});

// Method to get answered count
testSessionSchema.methods.getAnsweredCount = function (): number {
  return this.answers.size;
};

// Method to get unanswered count
testSessionSchema.methods.getUnansweredCount = function (): number {
  return this.questions.length - this.answers.size;
};

// Method to get time remaining
testSessionSchema.methods.getTimeRemaining = function (): number {
  if (this.status !== "in_progress") return 0;
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
  return Math.max(0, this.duration - elapsed);
};

// Pre-save middleware to validate answers
testSessionSchema.pre("save", function (next) {
  // Ensure all answers are valid indices
  for (const [key, value] of this.answers.entries()) {
    const index = parseInt(key);
    if (isNaN(index) || index < 0 || index >= this.questions.length) {
      this.answers.delete(key);
    }
    if (typeof value !== "number" || value < 0) {
      this.answers.delete(key);
    }
  }
  next();
});

// Static method to find active test for user
testSessionSchema.statics.findActiveTest = function (userId: string) {
  return this.findOne({
    user: userId,
    status: "in_progress",
  }).populate("questions");
};

// Static method to get user's test statistics
testSessionSchema.statics.getUserStats = async function (userId: string) {
  const stats = await this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        status: "completed",
      },
    },
    {
      $group: {
        _id: null,
        totalTests: { $sum: 1 },
        averageScore: { $avg: "$score" },
        highestScore: { $max: "$score" },
        lowestScore: { $min: "$score" },
        totalTimeSpent: {
          $sum: {
            $cond: [
              { $and: ["$endTime", "$startTime"] },
              { $subtract: ["$endTime", "$startTime"] },
              0,
            ],
          },
        },
      },
    },
  ]);

  return stats[0] || null;
};

export const TestSession = mongoose.model<ITestSessionDocument>(
  "TestSession",
  testSessionSchema,
);
