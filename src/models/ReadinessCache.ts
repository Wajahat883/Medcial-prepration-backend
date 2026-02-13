import mongoose, { Schema, Document } from "mongoose";

export interface IReadinessCache extends Document {
  userId: mongoose.Types.ObjectId;
  score: number;
  components: any;
  updatedAt: Date;
}

const readinessCacheSchema = new Schema<IReadinessCache>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    components: { type: Schema.Types.Mixed, default: {} },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

readinessCacheSchema.index({ userId: 1, updatedAt: -1 });

export const ReadinessCache = mongoose.model<IReadinessCache>("ReadinessCache", readinessCacheSchema);
