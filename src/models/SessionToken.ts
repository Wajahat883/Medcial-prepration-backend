import mongoose, { Schema, Document } from "mongoose";

export interface ISessionToken extends Document {
  tokenId: string;
  userId: mongoose.Types.ObjectId;
  sessionId?: mongoose.Types.ObjectId;
  questionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  expiresAt: Date;
  usedCount: number;
}

const sessionTokenSchema = new Schema<ISessionToken>(
  {
    tokenId: { type: String, required: true, index: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", default: null },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", default: null },
    expiresAt: { type: Date, required: true, index: true },
    usedCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

sessionTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionToken = mongoose.model<ISessionToken>("SessionToken", sessionTokenSchema);
