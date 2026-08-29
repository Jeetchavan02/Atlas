import { Router, type Request, type Response, type NextFunction } from "express";
import HealthMetric from "../models/HealthMetric.js";
import { computeRecoveryScore } from "../services/zeppNormalizer.js";

const router = Router();

// Helper to get or create today's health metric document
async function getOrCreateTodayMetric(): Promise<any> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let metric = await HealthMetric.findOne({ date: today });
  if (!metric) {
    metric = await HealthMetric.create({ date: today });
  }
  return metric;
}

// ─── POST /api/sync/zepp ──────────────────────────────────────────────────────
router.post("/zepp", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { steps, liveHeartRate, restingHeartRate, hrv, sleepHours, sleepScore } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const update: Record<string, any> = {
      watchSyncedAt: new Date(),
    };

    if (steps !== undefined) update.steps = steps;
    if (liveHeartRate !== undefined) update.liveHeartRate = liveHeartRate;
    if (restingHeartRate !== undefined) update.restingHeartRate = restingHeartRate;
    if (hrv !== undefined) update.hrv = hrv;
    if (sleepHours !== undefined) update.sleepHours = sleepHours;
    if (sleepScore !== undefined) update.sleepScore = sleepScore;

    // Calculate recovery score if we have sufficient inputs
    const current = await getOrCreateTodayMetric();
    const tempMetric = {
      sleepHours: sleepHours ?? current.sleepHours,
      hrv: hrv ?? current.hrv,
      restingHeartRate: restingHeartRate ?? current.restingHeartRate,
      dataTypes: ["zepp"],
    };
    update.recoveryScore = computeRecoveryScore(tempMetric as any);

    // Save live heart rate readings timeseries
    const pushes: Record<string, any> = {};
    if (liveHeartRate !== undefined) {
      pushes.heartRateReadings = {
        time: Date.now(),
        bpm: liveHeartRate,
      };
    }

    const metric = await HealthMetric.findOneAndUpdate(
      { date: today },
      {
        $set: update,
        ...(pushes.heartRateReadings ? { $push: pushes } : {}),
      },
      { upsert: true, new: true },
    );

    res.json({ ok: true, source: "zepp", metric });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/sync/huawei ────────────────────────────────────────────────────
router.post("/huawei", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { steps, caloriesBurned, waterLiters, restingHeartRate } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const update: Record<string, any> = {
      watchSyncedAt: new Date(),
    };

    if (steps !== undefined) update.steps = steps;
    if (caloriesBurned !== undefined) update.caloriesBurned = caloriesBurned;
    if (waterLiters !== undefined) update.waterLiters = waterLiters;
    if (restingHeartRate !== undefined) update.restingHeartRate = restingHeartRate;

    const metric = await HealthMetric.findOneAndUpdate(
      { date: today },
      { $set: update },
      { upsert: true, new: true },
    );

    res.json({ ok: true, source: "huawei", metric });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/sync/okok ──────────────────────────────────────────────────────
router.post("/okok", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { weight, bodyFat } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const update: Record<string, any> = {};
    if (weight !== undefined) update.weight = weight;
    // (bodyFat can be logged or noted if a field existed, for now weight is primary body metric)

    const metric = await HealthMetric.findOneAndUpdate(
      { date: today },
      { $set: update },
      { upsert: true, new: true },
    );

    res.json({ ok: true, source: "okok", metric });
  } catch (err) {
    next(err);
  }
});

export default router;
