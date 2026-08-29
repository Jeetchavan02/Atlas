import mongoose, { Schema, type Document } from "mongoose";

export interface IMacroEntry {
  protein: number;
  carbs: number;
  fat: number;
}

export interface IMacroTarget {
  protein: number;
  carbs: number;
  fat: number;
}

export interface IHeartRateReading {
  time: number;
  bpm: number;
}

export interface ISleepStages {
  deep: number; // hours
  light: number;
  rem: number;
  awake: number;
}

export interface IActiveSession {
  type: string; // "treadmill" | "run" | "cycle" | "swim" etc.
  startedAt: Date;
  durationMin: number;
  steps?: number;
  caloriesBurned?: number;
  distanceKm?: number;
  avgHR?: number;
}

export interface IHealthMetric extends Document {
  date: Date;

  // ─── Wearable / Watch sync ───────────────────────────────────────────
  watchSyncedAt?: Date;
  liveHeartRate?: number; // most recent HR reading from watch
  hrv?: number; // HRV in ms
  spo2?: number; // blood oxygen %
  stressScore?: number; // 0-100
  recoveryScore?: number; // 0-100 (computed)
  activeSessions?: IActiveSession[];

  // ─── Daily metrics ───────────────────────────────────────────────────
  steps: number;
  caloriesBurned: number;
  caloriesConsumed: number;
  waterLiters: number;
  restingHeartRate: number;
  sleepHours: number;
  sleepScore: number;
  sleepStages?: ISleepStages;

  // ─── Nutrition ───────────────────────────────────────────────────────
  macros: IMacroEntry;
  macroTargets: IMacroTarget;

  // ─── Heart rate ──────────────────────────────────────────────────────
  heartRateReadings: IHeartRateReading[];

  // ─── Body metrics ────────────────────────────────────────────────────
  weight: number;

  createdAt: Date;
  updatedAt: Date;
}

const heartRateReadingSchema = new Schema<IHeartRateReading>(
  {
    time: { type: Number, required: true },
    bpm: { type: Number, required: true },
  },
  { _id: false },
);

const activeSessionSchema = new Schema<IActiveSession>(
  {
    type: { type: String, required: true },
    startedAt: { type: Date, required: true },
    durationMin: { type: Number, required: true },
    steps: { type: Number },
    caloriesBurned: { type: Number },
    distanceKm: { type: Number },
    avgHR: { type: Number },
  },
  { _id: false },
);

const healthMetricSchema = new Schema<IHealthMetric>(
  {
    date: { type: Date, required: true, unique: true, default: () => new Date() },

    // Wearable sync
    watchSyncedAt: { type: Date },
    liveHeartRate: { type: Number },
    hrv: { type: Number },
    spo2: { type: Number },
    stressScore: { type: Number },
    recoveryScore: { type: Number },
    activeSessions: [activeSessionSchema],

    // Daily
    steps: { type: Number, default: 0 },
    caloriesBurned: { type: Number, default: 0 },
    caloriesConsumed: { type: Number, default: 0 },
    waterLiters: { type: Number, default: 0 },
    restingHeartRate: { type: Number, default: 0 },
    sleepHours: { type: Number, default: 0 },
    sleepScore: { type: Number, default: 0 },
    sleepStages: {
      deep: { type: Number },
      light: { type: Number },
      rem: { type: Number },
      awake: { type: Number },
    },

    // Nutrition
    macros: {
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
    },
    macroTargets: {
      protein: { type: Number, default: 180 },
      carbs: { type: Number, default: 280 },
      fat: { type: Number, default: 80 },
    },

    // Heart rate
    heartRateReadings: [heartRateReadingSchema],

    // Body
    weight: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model<IHealthMetric>("HealthMetric", healthMetricSchema);
