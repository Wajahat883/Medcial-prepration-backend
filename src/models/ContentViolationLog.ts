import mongoose, { Schema, Document } from "mongoose";

export interface IContentViolationLog extends Document {
  userId: mongoose.Types.ObjectId;
  violationType: string;
  timestamp: Date;
  severity?: string;
  actionTaken?: string;
}

const contentViolationSchema = new Schema<IContentViolationLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    violationType: { type: String, required: true, index: true },
    severity: { type: String, enum: ["low", "medium", "high"], default: "low" },
    actionTaken: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

contentViolationSchema.index({ timestamp: -1 });

export const ContentViolationLog = mongoose.model<IContentViolationLog>("ContentViolationLog", contentViolationSchema);
