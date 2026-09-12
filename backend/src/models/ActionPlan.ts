import mongoose, { Schema, type Document } from "mongoose";

export interface IActionPlanStep {
  toolName: string;
  parameters: any;
  description: string;
}

export type ActionPlanStatus = "PROPOSED" | "APPROVED" | "REJECTED" | "EXECUTED" | "FAILED";

export interface IActionPlan extends Document {
  userId: string;
  title: string;
  description: string;
  steps: IActionPlanStep[];
  status: ActionPlanStatus;
  executionError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const actionPlanStepSchema = new Schema<IActionPlanStep>({
  toolName: { type: String, required: true },
  parameters: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String, required: true }
}, { _id: false });

const actionPlanSchema = new Schema<IActionPlan>(
  {
    userId: { type: String, required: true, default: "default" },
    title: { type: String, required: true },
    description: { type: String, required: true },
    steps: { type: [actionPlanStepSchema], required: true },
    status: {
      type: String,
      enum: ["PROPOSED", "APPROVED", "REJECTED", "EXECUTED", "FAILED"],
      default: "PROPOSED",
    },
    executionError: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model<IActionPlan>("ActionPlan", actionPlanSchema);
