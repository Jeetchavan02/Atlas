import { Router, type Request, type Response, type NextFunction } from "express";
import Automation from "../models/Automation.js";
import { eventBus } from "../services/eventBus.js";

const router = Router();

// GET /api/automations - fetch automations
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const automations = await Automation.find({ userId: "default" }).sort({ createdAt: -1 });
    res.json({ automations });
  } catch (err) {
    next(err);
  }
});

// POST /api/automations - create automation
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const automation = await Automation.create({
      userId: "default",
      ...req.body
    });
    // Immediately register it with the event bus daemon
    eventBus.emitEvent("SYSTEM_BOOT", null, "AUTOMATION_API"); // hack to reload automations
    res.status(201).json({ automation });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/automations/:id/toggle - toggle automation state
router.patch("/:id/toggle", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive } = req.body;
    const automation = await Automation.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    if (!automation) {
      res.status(404).json({ error: "Automation not found" });
      return;
    }
    eventBus.emitEvent("SYSTEM_BOOT", null, "AUTOMATION_API");
    res.json({ automation });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/automations/:id - delete automation
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const automation = await Automation.findByIdAndDelete(req.params.id);
    if (!automation) {
      res.status(404).json({ error: "Automation not found" });
      return;
    }
    eventBus.emitEvent("SYSTEM_BOOT", null, "AUTOMATION_API");
    res.json({ message: "Automation deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
