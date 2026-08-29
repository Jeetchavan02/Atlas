import { Router, type Request, type Response, type NextFunction } from "express";
import GymSession from "../models/GymSession.js";

const router = Router();

router.get("/sessions", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await GymSession.find().sort({ date: -1 }).limit(20);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

router.post("/log-session", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, duration, exercises, strain, hrv, rhr } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: "Session name is required" });
      return;
    }

    const session = await GymSession.create({
      name: name.trim(),
      duration: duration || 0,
      exercises: exercises || [],
      strain: strain || 0,
      hrv: hrv || 0,
      rhr: rhr || 0,
      date: new Date(),
    });

    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
});

router.get("/weekly-volume", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const sessions = await GymSession.find({
      date: { $gte: startOfWeek, $lt: endOfWeek },
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekVolume = dayNames.map((day, i) => {
      const dayStart = new Date(startOfWeek);
      dayStart.setDate(dayStart.getDate() + i);

      const daySessions = sessions.filter((s) => {
        const sDate = new Date(s.date);
        return sDate.getDay() === i;
      });

      const totalVolume = daySessions.reduce((sum, s) => {
        return (
          sum +
          s.exercises.reduce((exSum, ex) => exSum + ex.sets * ex.reps * ex.weight, 0)
        );
      }, 0);

      return { day, v: totalVolume };
    });

    const totalWeekVolume = weekVolume.reduce((sum, d) => sum + d.v, 0);

    res.json({ weeklyVolume: weekVolume, totalKg: totalWeekVolume });
  } catch (err) {
    next(err);
  }
});

router.get("/stats", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const allSessions = await GymSession.find().sort({ date: -1 });
    const weekSessions = allSessions.filter(
      (s) => new Date(s.date) >= startOfWeek,
    );

    const splitTotals: Record<string, number> = {};
    for (const s of weekSessions) {
      const total = s.exercises.reduce(
        (sum, ex) => sum + ex.sets * ex.reps * ex.weight,
        0,
      );
      splitTotals[s.name] = (splitTotals[s.name] || 0) + total;
    }

    const grandTotal = Object.values(splitTotals).reduce((sum, v) => sum + v, 0);
    const splitData = Object.entries(splitTotals).map(([name, value]) => ({
      name,
      value: grandTotal > 0 ? Math.round((value / grandTotal) * 100) : 0,
    }));

    const prs = allSessions.flatMap((s) =>
      s.exercises.filter((ex) => ex.pr).map((ex) => ex.name),
    );

    const avgStrain =
      weekSessions.length > 0
        ? weekSessions.reduce((sum, s) => sum + s.strain, 0) / weekSessions.length
        : 0;

    const latest = allSessions[0];
    const avgHrv = latest?.hrv || 0;
    const avgRhr = latest?.rhr || 0;

    res.json({
      stats: {
        sessionsThisWeek: weekSessions.length,
        prs: prs.length,
        prNames: [...new Set(prs)],
        avgStrain: Math.round(avgStrain * 10) / 10,
        avgHrv: Math.round(avgHrv),
        avgRhr: Math.round(avgRhr),
      },
      split: splitData,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
