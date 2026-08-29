import { Router, type Request, type Response, type NextFunction } from "express";
import HealthMetric from "../models/HealthMetric.js";

const router = Router();

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todaysMetric = await HealthMetric.findOne({ date: today });

    if (!todaysMetric) {
      todaysMetric = await HealthMetric.create({ date: today });
    }

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMetrics = await HealthMetric.find({
      date: { $gte: thirtyDaysAgo },
    }).sort({ date: 1 });

    const weightTrend = recentMetrics
      .filter((m) => m.weight > 0)
      .map((m) => ({
        d: new Date(m.date).getDate(),
        w: m.weight,
      }));

    const macros = [
      {
        name: "Protein",
        value: todaysMetric.macros.protein,
        target: todaysMetric.macroTargets.protein,
        fill: "oklch(0.7 0.2 290)",
      },
      {
        name: "Carbs",
        value: todaysMetric.macros.carbs,
        target: todaysMetric.macroTargets.carbs,
        fill: "oklch(0.82 0.15 200)",
      },
      {
        name: "Fat",
        value: todaysMetric.macros.fat,
        target: todaysMetric.macroTargets.fat,
        fill: "oklch(0.82 0.16 75)",
      },
    ];

    const totalCalories =
      todaysMetric.macros.protein * 4 +
      todaysMetric.macros.carbs * 4 +
      todaysMetric.macros.fat * 9;

    const heartRateData = todaysMetric.heartRateReadings.map((r) => ({
      t: r.time,
      bpm: r.bpm,
    }));

    res.json({
      today: {
        restingHeartRate: todaysMetric.restingHeartRate,
        liveHeartRate: todaysMetric.liveHeartRate,
        steps: todaysMetric.steps,
        caloriesBurned: todaysMetric.caloriesBurned,
        waterLiters: todaysMetric.waterLiters,
        sleepHours: todaysMetric.sleepHours,
        sleepScore: todaysMetric.sleepScore,
        spo2: todaysMetric.spo2,
        stressScore: todaysMetric.stressScore,
        hrv: todaysMetric.hrv,
        recoveryScore: todaysMetric.recoveryScore,
        watchSyncedAt: todaysMetric.watchSyncedAt,
        macros,
        totalCalories,
        macrosPie: macros.map((m) => ({ name: m.name, value: m.value, fill: m.fill })),
        heartRate: heartRateData,
      },
      weightTrend,
    });
  } catch (err) {
    next(err);
  }
});

router.put("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const update = req.body;
    const allowedFields = [
      "steps",
      "caloriesBurned",
      "caloriesConsumed",
      "waterLiters",
      "restingHeartRate",
      "sleepHours",
      "sleepScore",
      "macros",
      "macroTargets",
      "heartRateReadings",
      "weight",
    ];

    const setFields: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (update[key] !== undefined) {
        setFields[key] = update[key];
      }
    }

    const metric = await HealthMetric.findOneAndUpdate(
      { date: today },
      { $set: setFields },
      { upsert: true, new: true, runValidators: true },
    );

    res.json({ metric });
  } catch (err) {
    next(err);
  }
});

router.get("/weight-history", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const metrics = await HealthMetric.find({
      date: { $gte: ninetyDaysAgo },
      weight: { $gt: 0 },
    }).sort({ date: 1 });

    const weightHistory = metrics.map((m) => ({
      d: new Date(m.date).getDate(),
      w: m.weight,
      fullDate: m.date,
    }));

    res.json({ weightHistory });
  } catch (err) {
    next(err);
  }
});

export default router;
