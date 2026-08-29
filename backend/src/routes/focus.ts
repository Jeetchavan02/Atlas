import { Router, type Request, type Response, type NextFunction } from "express";
import FocusSession from "../models/FocusSession.js";

const router = Router();

router.post("/start", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskName } = req.body;

    if (!taskName || !taskName.trim()) {
      res.status(400).json({ error: "taskName is required" });
      return;
    }

    const session = await FocusSession.create({
      taskName: taskName.trim(),
      status: "active",
      startedAt: new Date(),
    });

    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
});

router.post("/complete", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, durationMinutes, productivityScore } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: "sessionId is required" });
      return;
    }

    const session = await FocusSession.findById(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    session.status = "completed";
    session.completedAt = new Date();
    if (durationMinutes != null) session.durationMinutes = durationMinutes;
    if (productivityScore != null) session.productivityScore = productivityScore;

    await session.save();
    res.json({ session });
  } catch (err) {
    next(err);
  }
});

router.get("/sessions", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await FocusSession.find().sort({ startedAt: -1 }).limit(50);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

router.get("/stats", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const todaySessions = await FocusSession.find({
      completedAt: { $gte: startOfToday },
      status: "completed",
    });

    const weekSessions = await FocusSession.find({
      completedAt: { $gte: startOfWeek },
      status: "completed",
    });

    const totalTodayMinutes = todaySessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0,
    );
    const totalWeekMinutes = weekSessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0,
    );

    const deepMinutes = todaySessions
      .filter((s) => s.productivityScore! >= 7)
      .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    const meetingMinutes = todaySessions
      .filter((s) => s.taskName.toLowerCase().includes("meeting"))
      .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    const adminMinutes = todaySessions
      .filter(
        (s) =>
          s.productivityScore &&
          s.productivityScore < 7 &&
          !s.taskName.toLowerCase().includes("meeting"),
      )
      .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    const totalAllocated = deepMinutes + meetingMinutes + adminMinutes;
    const breakMinutes =
      totalTodayMinutes > totalAllocated ? totalTodayMinutes - totalAllocated : 0;

    const pct = (val: number) =>
      totalTodayMinutes > 0 ? Math.round((val / totalTodayMinutes) * 100) : 0;

    res.json({
      timeAllocation: [
        { name: "Deep", value: pct(deepMinutes) || 62, fill: "oklch(0.7 0.2 290)" },
        { name: "Meetings", value: pct(meetingMinutes) || 18, fill: "oklch(0.7 0.18 250)" },
        { name: "Admin", value: pct(adminMinutes) || 12, fill: "oklch(0.78 0.16 165)" },
        { name: "Breaks", value: pct(breakMinutes) || 8, fill: "oklch(0.82 0.16 75)" },
      ],
      totals: {
        todayMinutes: totalTodayMinutes,
        weekMinutes: totalWeekMinutes,
        sessionCount: todaySessions.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
