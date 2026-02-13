import mongoose, { Schema, Document } from "mongoose";

export interface IQuestionContentGovernance extends Document {
  questionId: mongoose.Types.ObjectId;
  currentStatus: string;
  workflowStage: string;
  assignedTo?: mongoose.Types.ObjectId;
  deadline?: Date;
  comments?: any;
  updatedAt?: Date;
}

const questionContentGovernanceSchema = new Schema<IQuestionContentGovernance>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true, index: true, unique: true },
    currentStatus: { type: String, enum: ["draft","peer_review","senior_review","editor_review","published","archived"], default: "draft", index: true },
    workflowStage: { type: String, default: "draft" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deadline: { type: Date, default: null },
    comments: { type: Schema.Types.Mixed, default: [] },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

questionContentGovernanceSchema.index({ questionId: 1 });

export const QuestionContentGovernance = mongoose.model<IQuestionContentGovernance>("QuestionContentGovernance", questionContentGovernanceSchema);
