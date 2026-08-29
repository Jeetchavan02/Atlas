import mongoose, { Schema, type Document } from "mongoose";

export type TaskPriority = "high" | "med" | "low";
export type TaskProject = "Atlas" | "Work" | "Health" | "Personal";

export interface ITask extends Document {
  title: string;
  project: TaskProject;
  priority: TaskPriority;
  dueDate: Date;
  dueLabel: string;
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    project: {
      type: String,
      required: true,
      enum: ["Atlas", "Work", "Health", "Personal"],
    },
    priority: {
      type: String,
      required: true,
      enum: ["high", "med", "low"],
    },
    dueDate: { type: Date, required: true },
    dueLabel: { type: String, default: "Today" },
    done: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model<ITask>("Task", taskSchema);
