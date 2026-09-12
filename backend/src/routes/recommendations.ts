import { Router, type Request, type Response } from "express";
import Recommendation from "../models/Recommendation.js";
import { registry } from "../services/actions.js";
import { eventBus } from "../services/eventBus.js";

const router = Router();

// GET /api/recommendations -> fetch active ones for Mission Control
router.get("/", async (req: Request, res: Response) => {
  try {
    const recs = await Recommendation.find({ 
      status: { $in: ["PENDING", "APPROVED"] },
      userId: "default"
    }).sort({ createdAt: -1 });
    
    res.json(recs);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/recommendations/:id/approve -> Execute the suggested action
router.post("/:id/approve", async (req: Request, res: Response): Promise<any> => {
  try {
    const rec = await Recommendation.findById(req.params.id);
    if (!rec) return res.status(404).json({ error: "Recommendation not found" });
    
    if (rec.status !== "PENDING") {
      return res.status(400).json({ error: "Recommendation is not pending" });
    }

    rec.status = "APPROVED";
    await rec.save();

    let actionResult = null;
    if (rec.suggestedActionId) {
      console.log(`[recommendations] Executing approved action: ${rec.suggestedActionId}`);
      try {
        actionResult = await registry.execute(rec.suggestedActionId, rec.suggestedActionPayload || {});
        rec.status = "EXECUTED";
        await rec.save();
      } catch (err) {
        console.error("[recommendations] Action execution failed:", err);
        return res.status(500).json({ error: "Execution failed", details: (err as Error).message });
      }
    } else {
      rec.status = "EXECUTED"; // No specific action to execute, just acknowledging
      await rec.save();
    }
    
    eventBus.emitEvent("RECOMMENDATION_EXECUTED", { recommendationId: rec._id, actionResult }, "USER");

    res.json({ success: true, actionResult, recommendation: rec });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/recommendations/:id/dismiss -> Dismiss it
router.post("/:id/dismiss", async (req: Request, res: Response): Promise<any> => {
  try {
    const rec = await Recommendation.findById(req.params.id);
    if (!rec) return res.status(404).json({ error: "Recommendation not found" });

    rec.status = "DISMISSED";
    await rec.save();

    res.json({ success: true, recommendation: rec });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
