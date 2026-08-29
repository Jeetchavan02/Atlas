import { Router, type Request, type Response, type NextFunction } from "express";
import Task from "../models/Task.js";

const router = Router();

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });

    const payload = tasks.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      project: t.project,
      priority: t.priority,
      due: t.dueLabel,
      done: t.done,
      createdAt: t.createdAt,
    }));

    const completed = tasks.filter((t) => t.done).length;
    const today = tasks.filter((t) => t.dueLabel === "Today");
    const highPriority = tasks.filter((t) => t.priority === "high");

    res.json({
      tasks: payload,
      stats: {
        total: tasks.length,
        completed,
        today: today.length,
        highPriority: highPriority.length,
        projects: ["Atlas", "Work", "Health", "Personal"].map((p) => ({
          name: p,
          count: tasks.filter((t) => t.project === p).length,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, project, priority, dueDate, dueLabel } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ error: "title is required" });
      return;
    }

    const task = await Task.create({
      title: title.trim(),
      project: project || "Personal",
      priority: priority || "med",
      dueDate: dueDate ? new Date(dueDate) : new Date(),
      dueLabel: dueLabel || "Today",
    });

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, project, priority, dueDate, dueLabel, done } = req.body;

    const update: Record<string, unknown> = {};
    if (title !== undefined) update.title = title.trim();
    if (project !== undefined) update.project = project;
    if (priority !== undefined) update.priority = priority;
    if (dueDate !== undefined) update.dueDate = new Date(dueDate);
    if (dueLabel !== undefined) update.dueLabel = dueLabel;
    if (done !== undefined) update.done = done;

    const task = await Task.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.json({ task });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/toggle", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    task.done = !task.done;
    await task.save();

    res.json({ task });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json({ message: "Task deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
