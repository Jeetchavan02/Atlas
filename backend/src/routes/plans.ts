import { Router, type Request, type Response } from "express";
import ActionPlan from "../models/ActionPlan.js";
import { registry } from "../services/actions.js";
import { eventBus } from "../services/eventBus.js";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const plans = await ActionPlan.find({ 
      status: { $in: ["PROPOSED", "APPROVED"] },
      userId: "default"
    }).sort({ createdAt: -1 });
    
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/:id/approve", async (req: Request, res: Response): Promise<any> => {
  try {
    const plan = await ActionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    
    if (plan.status !== "PROPOSED") {
      return res.status(400).json({ error: "Plan is not proposed" });
    }

    plan.status = "APPROVED";
    await plan.save();

    eventBus.emitEvent("ACTION_PLAN_APPROVED", { planId: plan._id }, "USER");

    // Execute steps sequentially
    const results = [];
    let hasError = false;

    for (const step of plan.steps) {
      try {
        const result = await registry.execute(step.toolName, step.parameters, { isApproved: true });
        results.push({ step: step.description, status: "SUCCESS", result });
      } catch (err) {
        console.error(`[plans] Step execution failed: ${step.toolName}`, err);
        results.push({ step: step.description, status: "ERROR", error: (err as Error).message });
        hasError = true;
        break; // Stop execution on first failure
      }
    }

    if (hasError) {
      plan.status = "FAILED";
      plan.executionError = "A step in the plan failed.";
    } else {
      plan.status = "EXECUTED";
    }
    
    await plan.save();
    
    eventBus.emitEvent("ACTION_PLAN_EXECUTED", { planId: plan._id, success: !hasError }, "SYSTEM");

    res.json({ success: true, results, status: plan.status });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/:id/reject", async (req: Request, res: Response): Promise<any> => {
  try {
    const plan = await ActionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    plan.status = "REJECTED";
    await plan.save();
    
    eventBus.emitEvent("ACTION_PLAN_REJECTED", { planId: plan._id }, "USER");

    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
