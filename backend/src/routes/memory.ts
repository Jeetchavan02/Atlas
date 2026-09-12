import { Router, type Request, type Response, type NextFunction } from "express";
import Memory from "../models/Memory.js";

const router = Router();

// GET /api/memory - fetch memories
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memories = await Memory.find({ userId: "default" }).sort({ lastRecalled: -1, createdAt: -1 });
    res.json({ memories });
  } catch (err) {
    next(err);
  }
});

// POST /api/memory - manually create memory
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, content, tags, confidence } = req.body;
    const memory = await Memory.create({
      userId: "default",
      type,
      content,
      tags: tags || [],
      confidence: confidence || 90,
    });
    res.status(201).json({ memory });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/memory/:id - delete memory
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memory = await Memory.findByIdAndDelete(req.params.id);
    if (!memory) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }
    res.json({ message: "Memory deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
