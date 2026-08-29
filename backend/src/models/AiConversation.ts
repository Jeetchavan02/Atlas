import mongoose, { Schema, type Document } from "mongoose";

export interface IMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface IAiConversation extends Document {
  userId: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const aiConversationSchema = new Schema<IAiConversation>(
  {
    userId: { type: String, default: "default" },
    messages: [messageSchema],
  },
  { timestamps: true },
);

export default mongoose.model<IAiConversation>("AiConversation", aiConversationSchema);
