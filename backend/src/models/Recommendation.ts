import mongoose, { Schema, type Document } from "mongoose";
import { AttentionLevel } from "../services/attention/types.js";

export type RecommendationStatus = "PENDING" | "APPROVED" | "DISMISSED" | "EXPIRED" | "EXECUTED";

export interface IRecommendation extends Document {
  userId: string;
  triggerEventId?: string;
  dedupeKey: string;
  attentionLevel: AttentionLevel;
  title: string;
  description: string;
  evidence: string[];
  suggestedActionId?: string;
  suggestedActionPayload?: any;
  status: RecommendationStatus;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const recommendationSchema = new Schema<IRecommendation>(
  {
    userId: { type: String, required: true, default: "default" },
    triggerEventId: { type: String },
    dedupeKey: { type: String, required: true, index: true },
    attentionLevel: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    evidence: [{ type: String }],
    suggestedActionId: { type: String },
    suggestedActionPayload: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "DISMISSED", "EXPIRED", "EXECUTED"],
      default: "PENDING",
    },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

// TTL index to automatically expire documents if we want Mongo to handle deletion,
// but for Phase 4 we might want to keep EXPIRED ones for history. We'll manage it via status updates.
recommendationSchema.index({ dedupeKey: 1, status: 1 });

export default mongoose.model<IRecommendation>("Recommendation", recommendationSchema);
