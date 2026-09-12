import mongoose, { Schema, type Document } from "mongoose";

export type GoalStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "ABANDONED";
export type GoalPriority = "LOW" | "MEDIUM" | "HIGH";

export interface IGoal extends Document {
  userId: string;
  title: string;
  description: string;
  category: string;
  status: GoalStatus;
  priority: GoalPriority;
  deadline?: Date;
  progress: number; // 0-100
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema<IGoal>(
  {
    userId: { type: String, required: true, default: "default" },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "Personal" },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "PAUSED", "ABANDONED"],
      default: "ACTIVE",
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    deadline: { type: Date },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

// Indexes to speed up retrieval for context engine
goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ tags: 1 });

export default mongoose.model<IGoal>("Goal", goalSchema);
