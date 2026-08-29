import mongoose, { Schema, type Document } from "mongoose";

export type GmailPriority = "critical" | "high" | "medium";

export interface IGmailAlert extends Document {
  messageId: string;
  subject: string;
  sender: string;
  senderEmail: string;
  snippet: string;
  receivedAt: Date;
  priority: GmailPriority;
  priorityScore: number;
  keywords: string[];
  isRead: boolean;
  userId: string;
}

const gmailAlertSchema = new Schema<IGmailAlert>(
  {
    messageId: { type: String, required: true, unique: true },
    subject: { type: String, required: true },
    sender: { type: String, required: true },
    senderEmail: { type: String, required: true },
    snippet: { type: String, default: "" },
    receivedAt: { type: Date, required: true },
    priority: {
      type: String,
      enum: ["critical", "high", "medium"],
      default: "medium",
    },
    priorityScore: { type: Number, default: 0 },
    keywords: [{ type: String }],
    isRead: { type: Boolean, default: false },
    userId: { type: String, default: "default" },
  },
  { timestamps: true },
);

gmailAlertSchema.index({ userId: 1, isRead: 1, priorityScore: -1 });

export default mongoose.model<IGmailAlert>("GmailAlert", gmailAlertSchema);
