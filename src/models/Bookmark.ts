import mongoose, { Schema, Document } from "mongoose";
import { IBookmark } from "../types";

export interface IBookmarkDocument extends IBookmark, Document {
  // Add any instance methods here
}

const bookmarkSchema = new Schema<IBookmarkDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    question: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: [true, "Question is required"],
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2000, "Notes cannot exceed 2000 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound index to prevent duplicate bookmarks
bookmarkSchema.index({ user: 1, question: 1 }, { unique: true });

// Index for user's bookmarks sorted by creation date
bookmarkSchema.index({ user: 1, createdAt: -1 });

// Index for finding bookmarks by question
bookmarkSchema.index({ question: 1 });

// Virtual to check if bookmark has notes
bookmarkSchema.virtual("hasNotes").get(function () {
  return this.notes && this.notes.trim().length > 0;
});

// Static method to check if bookmark exists
bookmarkSchema.statics.exists = async function (
  userId: string,
  questionId: string,
): Promise<boolean> {
  const count = await this.countDocuments({
    user: userId,
    question: questionId,
  });
  return count > 0;
};

// Static method to get user's bookmarked question IDs
bookmarkSchema.statics.getBookmarkedQuestionIds = async function (
  userId: string,
): Promise<string[]> {
  const bookmarks = await this.find({ user: userId }).select("question");
  return bookmarks.map((b: any) => b.question.toString());
};

// Static method to count user's bookmarks
bookmarkSchema.statics.countByUser = function (userId: string) {
  return this.countDocuments({ user: userId });
};

export const Bookmark = mongoose.model<IBookmarkDocument>(
  "Bookmark",
  bookmarkSchema,
);
