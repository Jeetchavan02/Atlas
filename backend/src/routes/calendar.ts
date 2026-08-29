import { Router, type Request, type Response, type NextFunction } from "express";
import CalendarEvent from "../models/CalendarEvent.js";

const router = Router();

router.get("/events", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const events = await CalendarEvent.find({
      date: { $gte: startOfWeek, $lt: endOfWeek },
    }).sort({ startHour: 1 });

    const payload = events.map((e) => ({
      id: e._id.toString(),
      day: e.day,
      start: e.startHour,
      end: e.endHour,
      title: e.title,
      color: e.color,
      category: e.category,
    }));

    const todayEvents = events
      .filter((e) => {
        const eDate = new Date(e.date);
        return eDate.getDay() === now.getDay();
      })
      .map((e) => {
        const hourStr = `${Math.floor(e.startHour).toString().padStart(2, "0")}:${e.startHour % 1 === 0 ? "00" : "30"}`;
        return {
          time: hourStr,
          title: e.title,
          color: e.color,
        };
      });

    res.json({
      events: payload,
      today: todayEvents,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/events", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, day, startHour, endHour, color, category, date } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ error: "title is required" });
      return;
    }

    const event = await CalendarEvent.create({
      title: title.trim(),
      day: day ?? new Date().getDay(),
      startHour: startHour ?? 9,
      endHour: endHour ?? 10,
      color: color || "iris",
      category: category || "Deep",
      date: date ? new Date(date) : new Date(),
    });

    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
});

router.patch("/events/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const update: Record<string, unknown> = {};
    const fields = ["title", "day", "startHour", "endHour", "color", "category", "date"];
    for (const key of fields) {
      if (req.body[key] !== undefined) {
        update[key] = key === "date" ? new Date(req.body[key]) : req.body[key];
      }
    }

    const event = await CalendarEvent.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    res.json({ event });
  } catch (err) {
    next(err);
  }
});

router.delete("/events/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await CalendarEvent.findByIdAndDelete(req.params.id);
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json({ message: "Event deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
