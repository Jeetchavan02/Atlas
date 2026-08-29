import mongoose, { Schema, type Document } from "mongoose";

export interface IFocusSession extends Document {
  taskName: string;
  durationMinutes: number;
  completedAt: Date | null;
  productivityScore: number | null;
  status: "active" | "completed" | "cancelled";
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const focusSessionSchema = new Schema<IFocusSession>(
  {
    taskName: { type: String, required: true, trim: true },
    durationMinutes: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
    productivityScore: { type: Number, default: null, min: 1, max: 10 },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    startedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.model<IFocusSession>("FocusSession", focusSessionSchema);
