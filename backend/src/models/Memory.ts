import mongoose from "mongoose";

const memorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, default: "default" },
    type: { 
      type: String, 
      required: true, 
      enum: ["PREFERENCE", "GOAL", "FACT", "PATTERN", "DECISION"],
      default: "FACT"
    },
    content: { type: String, required: true },
    tags: [{ type: String }],
    confidence: { type: Number, min: 0, max: 100, default: 90 },
    lastRecalled: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Memory", memorySchema);
