import mongoose, { Schema, Document } from "mongoose";

export interface IStudentPerformanceDetail extends Document {
  userId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  sessionId?: mongoose.Types.ObjectId;
  timeTaken: number;
  confidenceLevel?: number;
  errorType?: string;
  attemptCount?: number;
  correctedOnRetry?: boolean;
  attemptedAt: Date;
}

const studentPerformanceSchema = new Schema<IStudentPerformanceDetail>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: "TestSession", default: null },
    timeTaken: { type: Number, required: true },
    confidenceLevel: { type: Number, min: 0, max: 100, default: null },
    errorType: { type: String, enum: ["knowledge_gap", "clinical_reasoning", "misinterpretation", "time_pressure", "none"], default: "none", index: true },
    attemptCount: { type: Number, default: 1 },
    correctedOnRetry: { type: Boolean, default: false },
    attemptedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

studentPerformanceSchema.index({ userId: 1, sessionId: 1 });
studentPerformanceSchema.index({ questionId: 1, attemptedAt: -1 });

export const StudentPerformanceDetail = mongoose.model<IStudentPerformanceDetail>("StudentPerformanceDetail", studentPerformanceSchema);
