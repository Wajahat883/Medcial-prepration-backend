import mongoose, { Schema, Document } from "mongoose";
import { IUserProgress } from "../types";

export interface IUserProgressDocument extends IUserProgress, Document {
  accuracy: number;
  // Instance methods
  updateCategoryProgress(category: string, isCorrect: boolean): Promise<void>;
  updateStreak(): Promise<void>;
  getWeakCategories(): Array<{ category: string; accuracy: number }>;
  getStrongCategories(): Array<{ category: string; accuracy: number }>;
}

const categoryProgressSchema = new Schema(
  {
    attempted: {
      type: Number,
      default: 0,
      min: 0,
    },
    correct: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const userProgressSchema = new Schema<IUserProgressDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      unique: true,
      index: true,
    },
    totalQuestionsAttempted: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCorrectAnswers: {
      type: Number,
      default: 0,
      min: 0,
    },
    categoryProgress: {
      type: Map,
      of: categoryProgressSchema,
      default: new Map(),
    },
    streakDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastStudyDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Index for finding active users by last study date
userProgressSchema.index({ lastStudyDate: -1 });
userProgressSchema.index({ streakDays: -1 });

// Virtual for overall accuracy
userProgressSchema.virtual("accuracy").get(function () {
  if (this.totalQuestionsAttempted === 0) return 0;
  return Math.round(
    (this.totalCorrectAnswers / this.totalQuestionsAttempted) * 100,
  );
});

// Virtual for total questions remaining to reach goal
userProgressSchema.virtual("questionsToGoal").get(function () {
  // Assuming a goal of 1000 questions for AMC preparation
  const goal = 1000;
  return Math.max(0, goal - this.totalQuestionsAttempted);
});

// Method to update category progress
userProgressSchema.methods.updateCategoryProgress = async function (
  category: string,
  isCorrect: boolean,
): Promise<void> {
  const progress = this.categoryProgress.get(category) || {
    attempted: 0,
    correct: 0,
  };
  progress.attempted++;
  if (isCorrect) progress.correct++;
  this.categoryProgress.set(category, progress);
  await this.save();
};

// Method to update streak
userProgressSchema.methods.updateStreak = async function (): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (this.lastStudyDate) {
    const lastStudy = new Date(this.lastStudyDate);
    lastStudy.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) {
      // Already studied today, do nothing
      return;
    } else if (diffDays === 1) {
      // Consecutive day
      this.streakDays += 1;
    } else if (diffDays > 1) {
      // Streak broken
      this.streakDays = 1;
    }
  } else {
    this.streakDays = 1;
  }

  this.lastStudyDate = new Date();
  await this.save();
};

// Method to get weak categories (accuracy < 50%)
userProgressSchema.methods.getWeakCategories = function (): Array<{
  category: string;
  accuracy: number;
}> {
  const weak: Array<{ category: string; accuracy: number }> = [];

  for (const [category, data] of this.categoryProgress.entries()) {
    if (data.attempted > 0) {
      const accuracy = (data.correct / data.attempted) * 100;
      if (accuracy < 50) {
        weak.push({ category, accuracy: Math.round(accuracy) });
      }
    }
  }

  return weak.sort((a, b) => a.accuracy - b.accuracy);
};

// Method to get strong categories (accuracy >= 70%)
userProgressSchema.methods.getStrongCategories = function (): Array<{
  category: string;
  accuracy: number;
}> {
  const strong: Array<{ category: string; accuracy: number }> = [];

  for (const [category, data] of this.categoryProgress.entries()) {
    if (data.attempted >= 5) {
      // At least 5 attempts for meaningful accuracy
      const accuracy = (data.correct / data.attempted) * 100;
      if (accuracy >= 70) {
        strong.push({ category, accuracy: Math.round(accuracy) });
      }
    }
  }

  return strong.sort((a, b) => b.accuracy - a.accuracy);
};

// Static method to get or create progress for user
userProgressSchema.statics.getOrCreate = async function (userId: string) {
  let progress = await this.findOne({ user: userId });

  if (!progress) {
    progress = await this.create({ user: userId });
  }

  return progress;
};

// Static method to get leaderboard
userProgressSchema.statics.getLeaderboard = async function (
  limit: number = 10,
) {
  return this.aggregate([
    {
      $addFields: {
        accuracy: {
          $cond: [
            { $eq: ["$totalQuestionsAttempted", 0] },
            0,
            {
              $multiply: [
                {
                  $divide: ["$totalCorrectAnswers", "$totalQuestionsAttempted"],
                },
                100,
              ],
            },
          ],
        },
      },
    },
    { $sort: { accuracy: -1, totalQuestionsAttempted: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $unwind: "$userDetails" },
    {
      $project: {
        _id: 0,
        userId: "$user",
        firstName: "$userDetails.firstName",
        lastName: "$userDetails.lastName",
        totalQuestionsAttempted: 1,
        totalCorrectAnswers: 1,
        accuracy: { $round: ["$accuracy", 0] },
        streakDays: 1,
      },
    },
  ]);
};

export const UserProgress = mongoose.model<IUserProgressDocument>(
  "UserProgress",
  userProgressSchema,
);
