/**
 * Zepp Mock Poller — Simulates Amazfit Bip 6 real-time data
 *
 * This service generates realistic biometric data following circadian patterns.
 * When ZEPP_MOCK_ENABLED=true, it runs every ZEPP_SYNC_INTERVAL_MS (default 15min)
 * and pushes to the /api/integrations/zepp/push endpoint internally.
 *
 * To replace with real data: build a Zepp OS Mini Program that calls the same
 * POST /api/integrations/zepp/push endpoint from its Side Service.
 */

import HealthMetric from "../models/HealthMetric.js";
import ZeppSync from "../models/ZeppSync.js";
import { normalizeZeppMiniProgram, computeRecoveryScore } from "./zeppNormalizer.js";

const DEVICE_MODEL = "Amazfit Bip 6";

// ─── Circadian helpers ────────────────────────────────────────────────────────

function getRHR(): number {
  // Resting HR naturally varies 50-60 bpm for a fit individual
  return 52 + Math.round(Math.random() * 6);
}

function getLiveHR(hour: number): number {
  // Active during commute hours (8-9, 17-19), peak during workout (6-7, 18-19)
  if (hour >= 6 && hour < 7.5) return 120 + Math.round(Math.random() * 35); // morning workout
  if (hour >= 8 && hour < 9.5) return 80 + Math.round(Math.random() * 20); // commute
  if (hour >= 12 && hour < 13) return 75 + Math.round(Math.random() * 15); // post-lunch walk
  if (hour >= 17 && hour < 19) return 90 + Math.round(Math.random() * 40); // evening exercise
  if (hour >= 22 || hour < 5) return 0; // asleep, no live reading
  return 60 + Math.round(Math.random() * 12); // resting/sedentary
}

function getStepIncrement(hour: number): number {
  // Steps accumulate throughout the day following activity patterns
  if (hour >= 22 || hour < 5) return 0;
  if (hour >= 6 && hour < 7.5) return 800 + Math.round(Math.random() * 400); // morning run
  if (hour >= 8 && hour < 9.5) return 400 + Math.round(Math.random() * 200); // commute
  if (hour >= 12 && hour < 13) return 300 + Math.round(Math.random() * 150); // lunch walk
  if (hour >= 17 && hour < 19) return 600 + Math.round(Math.random() * 300); // evening
  return 50 + Math.round(Math.random() * 80); // background activity
}

function getSleepData(
  hour: number,
): {
  totalHours: number;
  deepMinutes: number;
  lightMinutes: number;
  remMinutes: number;
  awakeMinutes: number;
} | null {
  // Sleep data available in the morning after waking
  if (hour >= 6 && hour < 10) {
    const totalHours = 5.5 + Math.random() * 2.5; // 5.5-8h
    const totalMin = totalHours * 60;
    const deepMin = Math.round(totalMin * (0.12 + Math.random() * 0.08)); // 12-20% deep
    const remMin = Math.round(totalMin * (0.18 + Math.random() * 0.07)); // 18-25% REM
    const awakeMin = Math.round(totalMin * (0.04 + Math.random() * 0.03));
    const lightMin = Math.round(totalMin - deepMin - remMin - awakeMin);
    return {
      totalHours,
      deepMinutes: deepMin,
      lightMinutes: lightMin,
      remMinutes: remMin,
      awakeMinutes: awakeMin,
    };
  }
  return null;
}

// ─── Main sync function ───────────────────────────────────────────────────────

export async function runZeppMockSync(userId = "default"): Promise<void> {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;

  // Skip during sleep hours (10pm-5am) — no meaningful data
  if (hour >= 22 || hour < 5) {
    console.log("[zepp-mock] Sleep window — skipping sync");
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get current step count to add increments on top
  const existing = await HealthMetric.findOne({ date: today });
  const currentSteps = existing?.steps ?? 0;

  const stepIncrement = getStepIncrement(hour);
  const liveHR = getLiveHR(hour);
  const rhr = getRHR();
  const spo2 = 95 + Math.round(Math.random() * 4); // 95-99%
  const stress = 20 + Math.round(Math.random() * 40); // 20-60
  const hrv = 65 + Math.round(Math.random() * 30); // 65-95ms
  const sleepData = getSleepData(hour);

  const rawPayload = {
    bpm: liveHR > 0 ? liveHR : undefined,
    steps: currentSteps + stepIncrement,
    calories: Math.round((currentSteps + stepIncrement) * 0.04 + 200), // rough estimate
    spo2,
    stress,
    hrv,
    sleep: sleepData ?? undefined,
  };

  const normalized = normalizeZeppMiniProgram(rawPayload);

  // Build today's new HR readings array
  const newHRReading = liveHR > 0 ? [{ time: now.getTime(), bpm: liveHR }] : [];

  // Upsert today's HealthMetric
  const setFields: Record<string, unknown> = {
    watchSyncedAt: now,
    liveHeartRate: liveHR > 0 ? liveHR : undefined,
    recoveryScore: normalized.recoveryScore,
  };

  if (normalized.steps !== undefined) setFields.steps = normalized.steps;
  if (normalized.caloriesBurned !== undefined) setFields.caloriesBurned = normalized.caloriesBurned;
  if (normalized.spo2 !== undefined) setFields.spo2 = normalized.spo2;
  if (normalized.stressScore !== undefined) setFields.stressScore = normalized.stressScore;
  if (normalized.sleepHours !== undefined) {
    setFields.sleepHours = normalized.sleepHours;
    setFields.sleepScore = Math.round(
      (normalized.sleepHours / 8) * 70 +
        ((normalized.sleepStages?.deep ?? 0) / (normalized.sleepHours || 1)) * 30,
    );
  }
  if (rhr > 0) setFields.restingHeartRate = rhr;

  await HealthMetric.findOneAndUpdate(
    { date: today },
    {
      $set: setFields,
      ...(newHRReading.length > 0 ? { $push: { heartRateReadings: { $each: newHRReading } } } : {}),
    },
    { upsert: true, new: true },
  );

  // Log the sync session
  await ZeppSync.create({
    userId,
    deviceModel: DEVICE_MODEL,
    syncedAt: now,
    dataTypes: normalized.dataTypes,
    source: "mock",
    rawPayload,
    processedMetrics: {
      steps: normalized.steps,
      caloriesBurned: normalized.caloriesBurned,
      liveHeartRate: liveHR > 0 ? liveHR : undefined,
      hrv,
      spo2: normalized.spo2,
      stressScore: normalized.stressScore,
      sleepHours: normalized.sleepHours,
      sleepStages: normalized.sleepStages,
      recoveryScore: normalized.recoveryScore,
    },
  });

  console.log(
    `[zepp-mock] Sync complete — steps: ${normalized.steps}, HR: ${liveHR > 0 ? liveHR : "n/a"} bpm, recovery: ${normalized.recoveryScore}`,
  );
}

/** Start the background mock sync loop */
export function startZeppMockPoller(intervalMs = 15 * 60 * 1000): void {
  if (process.env.ZEPP_MOCK_ENABLED !== "true") {
    console.log("[zepp-mock] Mock disabled (ZEPP_MOCK_ENABLED != true). Skipping.");
    return;
  }

  // Run once immediately on startup
  runZeppMockSync("default").catch(console.error);

  setInterval(() => {
    runZeppMockSync("default").catch(console.error);
  }, intervalMs);

  console.log(
    `[zepp-mock] Amazfit Bip 6 simulator started, syncing every ${intervalMs / 60000} min`,
  );
}
