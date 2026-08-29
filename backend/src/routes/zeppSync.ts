import { Router, type Request, type Response, type NextFunction } from "express";
import HealthMetric from "../models/HealthMetric.js";
import ZeppSync from "../models/ZeppSync.js";
import {
  normalizeZeppMiniProgram,
  normalizeHealthConnect,
  normalizeTerraWebhook,
  type AtlasHealthPayload,
} from "../services/zeppNormalizer.js";
import { runZeppMockSync } from "../services/zeppMockPoller.js";

const router = Router();

/** Apply a normalized health payload to today's HealthMetric document */
async function applyToTodaysMetric(payload: AtlasHealthPayload): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const setFields: Record<string, unknown> = {
    watchSyncedAt: new Date(),
  };

  if (payload.steps !== undefined) setFields.steps = payload.steps;
  if (payload.caloriesBurned !== undefined) setFields.caloriesBurned = payload.caloriesBurned;
  if (payload.liveHeartRate !== undefined) setFields.liveHeartRate = payload.liveHeartRate;
  if (payload.restingHeartRate !== undefined) setFields.restingHeartRate = payload.restingHeartRate;
  if (payload.spo2 !== undefined) setFields.spo2 = payload.spo2;
  if (payload.stressScore !== undefined) setFields.stressScore = payload.stressScore;
  if (payload.hrv !== undefined) setFields.hrv = payload.hrv;
  if (payload.recoveryScore !== undefined) setFields.recoveryScore = payload.recoveryScore;
  if (payload.waterLiters !== undefined) setFields.waterLiters = payload.waterLiters;
  if (payload.weight !== undefined) setFields.weight = payload.weight;

  if (payload.sleepHours !== undefined) {
    setFields.sleepHours = payload.sleepHours;
    if (payload.sleepStages) {
      const efficiency = Math.min(1, 1 - payload.sleepStages.awake / (payload.sleepHours || 1));
      setFields.sleepScore = Math.round(
        efficiency * 60 +
          (payload.sleepStages.deep / (payload.sleepHours || 1)) * 30 +
          (payload.sleepStages.rem / (payload.sleepHours || 1)) * 20,
      );
    }
  }

  const update: Record<string, unknown> = { $set: setFields };
  if (payload.heartRateReadings?.length) {
    update.$push = {
      heartRateReadings: {
        $each: payload.heartRateReadings.slice(-50), // cap at 50 readings per push
        $slice: -200, // keep latest 200 total
      },
    };
  }

  await HealthMetric.findOneAndUpdate({ date: today }, update, {
    upsert: true,
    new: true,
  });
}

// ─── POST /api/integrations/zepp/push ────────────────────────────────────────
// Accepts data from: Zepp OS Mini Program, Health Connect bridge, Terra webhook
router.post("/push", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.body.userId as string) || "default";
    const format = (req.query.format as string) || "zepp_mini_program";

    let normalized: AtlasHealthPayload;

    switch (format) {
      case "health_connect":
        normalized = normalizeHealthConnect(req.body);
        break;
      case "terra":
        normalized = normalizeTerraWebhook(req.body);
        break;
      case "zepp_mini_program":
      default:
        normalized = normalizeZeppMiniProgram(req.body);
        break;
    }

    await applyToTodaysMetric(normalized);

    const source =
      format === "terra"
        ? "terra"
        : format === "health_connect"
          ? "health_connect"
          : "mini_program";

    await ZeppSync.create({
      userId,
      deviceModel: (req.body.deviceModel as string) || "Amazfit Bip 6",
      syncedAt: new Date(),
      dataTypes: normalized.dataTypes,
      source,
      rawPayload: req.body,
      processedMetrics: {
        steps: normalized.steps,
        caloriesBurned: normalized.caloriesBurned,
        liveHeartRate: normalized.liveHeartRate,
        hrv: normalized.hrv,
        spo2: normalized.spo2,
        stressScore: normalized.stressScore,
        sleepHours: normalized.sleepHours,
        sleepStages: normalized.sleepStages,
        recoveryScore: normalized.recoveryScore,
      },
    });

    res.json({ ok: true, processedMetrics: normalized });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/integrations/zepp/status ───────────────────────────────────────
router.get("/status", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const latest = await ZeppSync.findOne({ userId: "default" }).sort({ syncedAt: -1 });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const metric = await HealthMetric.findOne({ date: today });

    const isLive =
      latest !== null && Date.now() - new Date(latest.syncedAt).getTime() < 20 * 60 * 1000; // < 20min

    res.json({
      isLive,
      lastSync: latest?.syncedAt ?? null,
      deviceModel: latest?.deviceModel ?? "Amazfit Bip 6",
      source: latest?.source ?? null,
      dataTypes: latest?.dataTypes ?? [],
      liveHeartRate: metric?.liveHeartRate ?? null,
      steps: metric?.steps ?? 0,
      recoveryScore: metric?.recoveryScore ?? null,
      spo2: metric?.spo2 ?? null,
      stressScore: metric?.stressScore ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/integrations/zepp/history ──────────────────────────────────────
router.get("/history", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sessions = await ZeppSync.find({
      userId: "default",
      syncedAt: { $gte: sevenDaysAgo },
    })
      .sort({ syncedAt: -1 })
      .limit(100);

    res.json({ sessions, count: sessions.length });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/integrations/zepp/trigger-mock ────────────────────────────────
// Force a mock sync cycle (useful for testing / manual refresh)
router.post("/trigger-mock", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await runZeppMockSync("default");
    const latest = await ZeppSync.findOne({ userId: "default" }).sort({ syncedAt: -1 });
    res.json({ ok: true, latest });
  } catch (err) {
    next(err);
  }
});

export default router;
