import mongoose, { Schema, Document } from "mongoose";

export interface IQuestionRevision extends Document {
  revisionId: string;
  questionId: mongoose.Types.ObjectId;
  content: string;
  status: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  changeDescription?: string;
}

const questionRevisionSchema = new Schema<IQuestionRevision>(
  {
    revisionId: { type: String, required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true, index: true },
    content: { type: String, required: true },
    status: { type: String, enum: ["draft", "peer_review", "senior_review", "editor_review", "published", "archived"], default: "draft", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    changeDescription: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

questionRevisionSchema.index({ questionId: 1, createdAt: -1 });

export const QuestionRevision = mongoose.model<IQuestionRevision>("QuestionRevision", questionRevisionSchema);
