import mongoose, { Schema, type Document } from "mongoose";

export interface IZeppSyncSession extends Document {
  userId: string;
  deviceModel: string;
  syncedAt: Date;
  dataTypes: string[];
  source: "mini_program" | "mock" | "terra" | "health_connect";
  rawPayload: Record<string, unknown>;
  processedMetrics: {
    steps?: number;
    caloriesBurned?: number;
    liveHeartRate?: number;
    hrv?: number;
    spo2?: number;
    stressScore?: number;
    sleepHours?: number;
    sleepStages?: {
      deep: number;
      light: number;
      rem: number;
      awake: number;
    };
    recoveryScore?: number;
  };
}

const zeppSyncSchema = new Schema<IZeppSyncSession>(
  {
    userId: { type: String, default: "default" },
    deviceModel: { type: String, default: "Amazfit Bip 6" },
    syncedAt: { type: Date, default: () => new Date() },
    dataTypes: [{ type: String }],
    source: {
      type: String,
      enum: ["mini_program", "mock", "terra", "health_connect"],
      default: "mock",
    },
    rawPayload: { type: Schema.Types.Mixed, default: {} },
    processedMetrics: {
      steps: Number,
      caloriesBurned: Number,
      liveHeartRate: Number,
      hrv: Number,
      spo2: Number,
      stressScore: Number,
      sleepHours: Number,
      sleepStages: {
        deep: Number,
        light: Number,
        rem: Number,
        awake: Number,
      },
      recoveryScore: Number,
    },
  },
  { timestamps: true },
);

zeppSyncSchema.index({ userId: 1, syncedAt: -1 });

export default mongoose.model<IZeppSyncSession>("ZeppSync", zeppSyncSchema);
