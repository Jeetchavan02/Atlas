/**
 * Zepp Health / Health Connect payload normalizer
 *
 * Converts raw payloads from multiple sources into the Atlas HealthMetric schema:
 * - Zepp OS Mini Program push format (native, direct from Bip 6)
 * - Android Health Connect export format
 * - Terra API webhook format (Zepp cloud-to-cloud via Terra)
 * - Generic wearable format (manual POST /api/health/sync-watch)
 */

export interface AtlasHealthPayload {
  steps?: number;
  caloriesBurned?: number;
  liveHeartRate?: number;
  restingHeartRate?: number;
  hrv?: number;
  spo2?: number;
  stressScore?: number;
  sleepHours?: number;
  sleepStages?: {
    deep: number; // hours
    light: number;
    rem: number;
    awake: number;
  };
  heartRateReadings?: Array<{ time: number; bpm: number }>;
  recoveryScore?: number;
  waterLiters?: number;
  weight?: number;
  dataTypes: string[];
}

// ─── Zepp OS Mini Program format ─────────────────────────────────────────────
// POST from Side Service (runs in Zepp phone app)
interface ZeppMiniProgramPayload {
  bpm?: number;
  steps?: number;
  spo2?: number;
  stress?: number;
  hrv?: number;
  calories?: number;
  timestamp?: number;
  sleep?: {
    totalHours?: number;
    deepMinutes?: number;
    lightMinutes?: number;
    remMinutes?: number;
    awakeMinutes?: number;
  };
}

export function normalizeZeppMiniProgram(raw: ZeppMiniProgramPayload): AtlasHealthPayload {
  const out: AtlasHealthPayload = { dataTypes: [] };

  if (raw.bpm !== undefined) {
    out.liveHeartRate = raw.bpm;
    out.dataTypes.push("heartRate");
  }
  if (raw.steps !== undefined) {
    out.steps = raw.steps;
    out.dataTypes.push("steps");
  }
  if (raw.calories !== undefined) {
    out.caloriesBurned = raw.calories;
    out.dataTypes.push("calories");
  }
  if (raw.spo2 !== undefined) {
    out.spo2 = raw.spo2;
    out.dataTypes.push("spo2");
  }
  if (raw.stress !== undefined) {
    out.stressScore = raw.stress;
    out.dataTypes.push("stress");
  }
  if (raw.hrv !== undefined) {
    out.hrv = raw.hrv;
    out.dataTypes.push("hrv");
  }
  if (raw.sleep) {
    const s = raw.sleep;
    const totalHours =
      s.totalHours ?? ((s.deepMinutes ?? 0) + (s.lightMinutes ?? 0) + (s.remMinutes ?? 0)) / 60;
    out.sleepHours = totalHours;
    out.sleepStages = {
      deep: (s.deepMinutes ?? 0) / 60,
      light: (s.lightMinutes ?? 0) / 60,
      rem: (s.remMinutes ?? 0) / 60,
      awake: (s.awakeMinutes ?? 0) / 60,
    };
    out.dataTypes.push("sleep");
  }

  out.recoveryScore = computeRecoveryScore(out);
  return out;
}

// ─── Health Connect Android format ───────────────────────────────────────────
interface HealthConnectPayload {
  stepCount?: { count: number };
  activeCaloriesBurned?: { energy: { inKilocalories: number } };
  heartRateSeries?: Array<{ time: string; beatsPerMinute: number }>;
  oxygenSaturation?: { percentage: number };
  restingHeartRate?: { beatsPerMinute: number };
  sleepSession?: {
    startTime: string;
    endTime: string;
    stages?: Array<{ stage: string; startTime: string; endTime: string }>;
  };
}

export function normalizeHealthConnect(raw: HealthConnectPayload): AtlasHealthPayload {
  const out: AtlasHealthPayload = { dataTypes: [] };

  if (raw.stepCount) {
    out.steps = raw.stepCount.count;
    out.dataTypes.push("steps");
  }
  if (raw.activeCaloriesBurned) {
    out.caloriesBurned = raw.activeCaloriesBurned.energy.inKilocalories;
    out.dataTypes.push("calories");
  }
  if (raw.restingHeartRate) {
    out.restingHeartRate = raw.restingHeartRate.beatsPerMinute;
    out.dataTypes.push("restingHR");
  }
  if (raw.heartRateSeries?.length) {
    out.heartRateReadings = raw.heartRateSeries.map((h) => ({
      time: new Date(h.time).getTime(),
      bpm: h.beatsPerMinute,
    }));
    out.liveHeartRate = raw.heartRateSeries[raw.heartRateSeries.length - 1].beatsPerMinute;
    out.dataTypes.push("heartRate");
  }
  if (raw.oxygenSaturation) {
    out.spo2 = raw.oxygenSaturation.percentage;
    out.dataTypes.push("spo2");
  }
  if (raw.sleepSession) {
    const start = new Date(raw.sleepSession.startTime).getTime();
    const end = new Date(raw.sleepSession.endTime).getTime();
    out.sleepHours = (end - start) / 3_600_000;

    if (raw.sleepSession.stages) {
      const stageTotals = { deep: 0, light: 0, rem: 0, awake: 0 };
      for (const s of raw.sleepSession.stages) {
        const dur = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3_600_000;
        const stageMap: Record<string, keyof typeof stageTotals> = {
          DEEP: "deep",
          SLEEPING: "deep",
          LIGHT: "light",
          REM: "rem",
          AWAKE: "awake",
          OUT_OF_BED: "awake",
        };
        const key = stageMap[s.stage.toUpperCase()];
        if (key) stageTotals[key] += dur;
      }
      out.sleepStages = stageTotals;
    }
    out.dataTypes.push("sleep");
  }

  out.recoveryScore = computeRecoveryScore(out);
  return out;
}

// ─── Terra API webhook format ─────────────────────────────────────────────────
interface TerraWebhookPayload {
  type: string;
  data: {
    daily_data?: Array<{
      steps_data?: { steps?: number };
      calories_data?: { total_burned_calories?: number };
      heart_rate_data?: {
        summary?: { resting_hr_bpm?: number; avg_hr_bpm?: number };
        detailed?: { hr_samples?: Array<{ timestamp: string; bpm: number }> };
      };
    }>;
    sleep_data?: Array<{
      sleep_durations_data?: {
        asleep?: { duration_asleep_state_seconds?: number };
        light_sleep?: { duration_light_sleep_state_seconds?: number };
        deep_sleep?: { duration_deep_sleep_state_seconds?: number };
        rem_sleep?: { duration_REM_sleep_state_seconds?: number };
        awake?: { duration_awake_state_seconds?: number };
      };
    }>;
    oxygen_data?: Array<{ spo2_percentage?: { avg_percentage?: number } }>;
  };
}

export function normalizeTerraWebhook(raw: TerraWebhookPayload): AtlasHealthPayload {
  const out: AtlasHealthPayload = { dataTypes: [] };
  const daily = raw.data.daily_data?.[0];
  const sleep = raw.data.sleep_data?.[0];
  const oxygen = raw.data.oxygen_data?.[0];

  if (daily?.steps_data?.steps !== undefined) {
    out.steps = daily.steps_data.steps;
    out.dataTypes.push("steps");
  }
  if (daily?.calories_data?.total_burned_calories !== undefined) {
    out.caloriesBurned = daily.calories_data.total_burned_calories;
    out.dataTypes.push("calories");
  }
  if (daily?.heart_rate_data?.summary?.resting_hr_bpm !== undefined) {
    out.restingHeartRate = daily.heart_rate_data.summary.resting_hr_bpm;
    out.dataTypes.push("restingHR");
  }
  if (daily?.heart_rate_data?.detailed?.hr_samples?.length) {
    out.heartRateReadings = daily.heart_rate_data.detailed.hr_samples.map((h) => ({
      time: new Date(h.timestamp).getTime(),
      bpm: h.bpm,
    }));
    out.dataTypes.push("heartRate");
  }
  if (sleep?.sleep_durations_data) {
    const sd = sleep.sleep_durations_data;
    const total = (sd.asleep?.duration_asleep_state_seconds ?? 0) / 3600;
    out.sleepHours = total;
    out.sleepStages = {
      light: (sd.light_sleep?.duration_light_sleep_state_seconds ?? 0) / 3600,
      deep: (sd.deep_sleep?.duration_deep_sleep_state_seconds ?? 0) / 3600,
      rem: (sd.rem_sleep?.duration_REM_sleep_state_seconds ?? 0) / 3600,
      awake: (sd.awake?.duration_awake_state_seconds ?? 0) / 3600,
    };
    out.dataTypes.push("sleep");
  }
  if (oxygen?.spo2_percentage?.avg_percentage !== undefined) {
    out.spo2 = oxygen.spo2_percentage.avg_percentage;
    out.dataTypes.push("spo2");
  }

  out.recoveryScore = computeRecoveryScore(out);
  return out;
}

// ─── Recovery score computation ──────────────────────────────────────────────
export function computeRecoveryScore(data: AtlasHealthPayload): number {
  let score = 50; // baseline

  // Sleep contribution (up to +30)
  if (data.sleepHours !== undefined) {
    const sleepOptimal = Math.min(data.sleepHours / 8, 1);
    score += sleepOptimal * 25;
  }
  if (data.sleepStages) {
    const deepRatio = data.sleepStages.deep / (data.sleepHours ?? 7);
    score += Math.min(deepRatio * 50, 10); // deep sleep bonus
  }

  // HRV contribution (up to +15)
  if (data.hrv !== undefined) {
    score += Math.min((data.hrv / 100) * 15, 15);
  }

  // Resting HR contribution (up to +10, lower is better)
  if (data.restingHeartRate !== undefined) {
    const hrBonus = Math.max(0, (60 - data.restingHeartRate) / 10) * 5;
    score += Math.min(hrBonus, 10);
  }

  // Stress penalty (up to -15)
  if (data.stressScore !== undefined) {
    score -= Math.min((data.stressScore / 100) * 15, 15);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
