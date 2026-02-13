import mongoose, { Schema, Document } from "mongoose";

export interface IUserCognitiveProfile extends Document {
  userId: mongoose.Types.ObjectId;
  strengthAreas: string[];
  weaknessAreas: string[];
  errorPatterns: any;
  reasoningSpeedPercentile?: number;
  lastUpdatedAt?: Date;
}

const userCognitiveProfileSchema = new Schema<IUserCognitiveProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true, unique: true },
    strengthAreas: { type: [String], default: [] },
    weaknessAreas: { type: [String], default: [] },
    errorPatterns: { type: Schema.Types.Mixed, default: {} },
    reasoningSpeedPercentile: { type: Number, default: null },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

userCognitiveProfileSchema.index({ userId: 1 });

export const UserCognitiveProfile = mongoose.model<IUserCognitiveProfile>("UserCognitiveProfile", userCognitiveProfileSchema);
