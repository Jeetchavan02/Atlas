import mongoose, { Schema, type Document } from "mongoose";

export type ConstraintType = "HARD" | "SOFT";

export interface IConstraint extends Document {
  userId: string;
  name: string;
  type: ConstraintType;
  description: string;
  isActive: boolean;
  timeframe?: {
    startHour?: number;
    endHour?: number;
    daysOfWeek?: number[]; // 0=Sunday, 1=Monday...
  };
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const constraintSchema = new Schema<IConstraint>(
  {
    userId: { type: String, required: true, default: "default" },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["HARD", "SOFT"],
      required: true,
      default: "SOFT",
    },
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    timeframe: {
      startHour: { type: Number, min: 0, max: 23 },
      endHour: { type: Number, min: 0, max: 23 },
      daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model<IConstraint>("Constraint", constraintSchema);
