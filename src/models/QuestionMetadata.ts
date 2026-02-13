import mongoose, { Schema, Document } from "mongoose";

export interface IQuestionMetadata extends Document {
  questionId: mongoose.Types.ObjectId;
  difficultyLevel?: string;
  recallFrequency?: number;
  examinerFavored?: boolean;
  lastReviewedAt?: Date | null;
  retirementStatus?: boolean;
}

const questionMetadataSchema = new Schema<IQuestionMetadata>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true, unique: true, index: true },
    difficultyLevel: { type: String, enum: ["easy", "medium", "hard"], default: "medium", index: true },
    recallFrequency: { type: Number, default: 0, index: true },
    examinerFavored: { type: Boolean, default: false, index: true },
    lastReviewedAt: { type: Date, default: null },
    retirementStatus: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

questionMetadataSchema.index({ recallFrequency: -1 });

export const QuestionMetadata = mongoose.model<IQuestionMetadata>("QuestionMetadata", questionMetadataSchema);
