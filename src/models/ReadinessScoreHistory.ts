import mongoose, { Schema, Document } from "mongoose";

export interface IReadinessScoreHistory extends Document {
  userId: mongoose.Types.ObjectId;
  score: number;
  components: any;
  calculatedAt: Date;
}

const readinessScoreSchema = new Schema<IReadinessScoreHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    components: { type: Schema.Types.Mixed, default: {} },
    calculatedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

readinessScoreSchema.index({ userId: 1, calculatedAt: -1 });

export const ReadinessScoreHistory = mongoose.model<IReadinessScoreHistory>("ReadinessScoreHistory", readinessScoreSchema);
