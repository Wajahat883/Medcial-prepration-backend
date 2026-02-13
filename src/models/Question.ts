import mongoose, { Schema, Document } from "mongoose";
import { IQuestion } from "../types";

export interface IQuestionDocument extends IQuestion, Document {
  // Add any instance methods here
}

const questionSchema = new Schema<IQuestionDocument>(
  {
    questionText: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
      minlength: [10, "Question text must be at least 10 characters"],
      maxlength: [5000, "Question text cannot exceed 5000 characters"],
    },
    options: {
      type: [String],
      required: [true, "Options are required"],
      validate: {
        validator: function (options: string[]) {
          return options.length >= 2 && options.length <= 6;
        },
        message: "Question must have between 2 and 6 options",
      },
    },
    correctAnswer: {
      type: Number,
      required: [true, "Correct answer is required"],
      min: [0, "Correct answer index must be at least 0"],
      validate: {
        validator: function (this: IQuestionDocument, value: number) {
          return value < this.options.length;
        },
        message: "Correct answer index must be less than the number of options",
      },
    },
    explanation: {
      type: String,
      required: [true, "Explanation is required"],
      trim: true,
      minlength: [10, "Explanation must be at least 10 characters"],
      maxlength: [10000, "Explanation cannot exceed 10000 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      index: true,
      trim: true,
    },
    subcategory: {
      type: String,
      index: true,
      trim: true,
      default: null,
    },
    difficulty: {
      type: String,
      enum: {
        values: ["easy", "medium", "hard"],
        message: "Difficulty must be easy, medium, or hard",
      },
      default: "medium",
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound indexes for efficient querying
questionSchema.index({ category: 1, difficulty: 1, isActive: 1 });
questionSchema.index({ category: 1, subcategory: 1, isActive: 1 });
questionSchema.index({ difficulty: 1, isActive: 1 });
questionSchema.index({ tags: 1, isActive: 1 });
questionSchema.index({ createdAt: -1 });
questionSchema.index({ questionText: "text", explanation: "text" }); // Text search

// Virtual for option count
questionSchema.virtual("optionCount").get(function () {
  return this.options.length;
});

// Static method to get random questions
questionSchema.statics.getRandom = async function (
  count: number,
  filter: any = {},
) {
  return this.aggregate([
    { $match: { ...filter, isActive: true } },
    { $sample: { size: count } },
  ]);
};

// Static method to get questions by category with stats
questionSchema.statics.getCategoryStats = async function () {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
        easyCount: {
          $sum: { $cond: [{ $eq: ["$difficulty", "easy"] }, 1, 0] },
        },
        mediumCount: {
          $sum: { $cond: [{ $eq: ["$difficulty", "medium"] }, 1, 0] },
        },
        hardCount: {
          $sum: { $cond: [{ $eq: ["$difficulty", "hard"] }, 1, 0] },
        },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

export const Question = mongoose.model<IQuestionDocument>(
  "Question",
  questionSchema,
);
