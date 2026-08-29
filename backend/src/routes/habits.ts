import { Router, type Request, type Response, type NextFunction } from "express";
import Habit from "../models/Habit.js";

const router = Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const habits = await Habit.find().sort({ createdAt: -1 });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const payload = habits.map((h) => {
      const todayEntry = h.history.find((entry) => {
        const d = new Date(entry.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === now.getTime();
      });

      return {
        _id: h._id,
        name: h.name,
        category: h.category,
        currentStreak: h.currentStreak,
        lastCompleted: h.lastCompleted,
        today: todayEntry ? todayEntry.completed : false,
        history: h.history,
        createdAt: h.createdAt,
      };
    });

    res.json({ habits: payload });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, category } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const habit = await Habit.create({ name: name.trim(), category });
    res.status(201).json({ habit });
  } catch (err) {
    next(err);
  }
});

router.post("/toggle", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { habitId } = req.body;

    if (!habitId) {
      res.status(400).json({ error: "habitId is required" });
      return;
    }

    const habit = await Habit.findById(habitId);
    if (!habit) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    const wasToday = habit.toggleToday();
    await habit.save();

    res.json({
      habit: {
        _id: habit._id,
        name: habit.name,
        category: habit.category,
        currentStreak: habit.currentStreak,
        lastCompleted: habit.lastCompleted,
        today: wasToday,
        history: habit.history,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
