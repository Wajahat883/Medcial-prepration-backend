import mongoose, { Schema, Document } from "mongoose";

export interface IRecallIntelligence extends Document {
  topic: string;
  recallFrequency: number;
  last30DaysCount: number;
  last90DaysCount: number;
  examinerMentions?: number;
  confidenceTrend?: number;
  createdAt: Date;
}

const recallIntelligenceSchema = new Schema<IRecallIntelligence>(
  {
    topic: { type: String, required: true, index: true },
    recallFrequency: { type: Number, default: 0, index: true },
    last30DaysCount: { type: Number, default: 0 },
    last90DaysCount: { type: Number, default: 0 },
    examinerMentions: { type: Number, default: 0 },
    confidenceTrend: { type: Number, default: 0 },
  },
  { timestamps: true },
);

recallIntelligenceSchema.index({ topic: 1, createdAt: -1 });

export const RecallIntelligence = mongoose.model<IRecallIntelligence>("RecallIntelligence", recallIntelligenceSchema);
