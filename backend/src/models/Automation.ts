import mongoose from "mongoose";

const automationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, default: "default" },
    name: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    
    // The EventBus event that triggers this automation
    triggerEvent: { type: String, required: true },
    
    // Simple condition evaluation (e.g. "payload.recoveryScore < 70")
    // For safety, we evaluate simple dot-notation properties rather than arbitrary JS
    condition: {
      field: { type: String },
      operator: { type: String, enum: ["==", "!=", ">", "<", ">=", "<=", "includes"] },
      value: { type: mongoose.Schema.Types.Mixed },
    },
    
    // The ActionRegistry action to execute
    action: {
      name: { type: String, required: true },
      params: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    },
    
    lastTriggered: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Automation", automationSchema);
