import mongoose, { Schema, Document } from "mongoose";

export interface IExplanationMetadata extends Document {
  questionId: mongoose.Types.ObjectId;
  structure: any;
  visualAids?: any;
  createdAt: Date;
}

const explanationMetadataSchema = new Schema<IExplanationMetadata>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true, index: true, unique: true },
    structure: { type: Schema.Types.Mixed, required: true },
    visualAids: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

explanationMetadataSchema.index({ questionId: 1 });

export const ExplanationMetadata = mongoose.model<IExplanationMetadata>("ExplanationMetadata", explanationMetadataSchema);
