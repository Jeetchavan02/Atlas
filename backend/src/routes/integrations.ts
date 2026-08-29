import { Router, type Request, type Response, type NextFunction } from "express";
import GmailAlert from "../models/GmailAlert.js";
import { pollGmailInbox } from "../services/gmailPoller.js";

const router = Router();

// ─── GET /api/integrations/gmail ─────────────────────────────────────────────
// Returns top 3 unread high-priority Gmail alerts
router.get("/gmail", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || "default";

    const alerts = await GmailAlert.find({ userId, isRead: false })
      .sort({ priorityScore: -1, receivedAt: -1 })
      .limit(3);

    const totalUnread = await GmailAlert.countDocuments({ userId, isRead: false });

    res.json({ alerts, totalUnread });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/integrations/gmail/mark-read ──────────────────────────────────
router.post("/gmail/mark-read", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.body;
    if (!messageId) {
      res.status(400).json({ error: "messageId is required" });
      return;
    }

    await GmailAlert.findOneAndUpdate({ messageId }, { isRead: true });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/integrations/gmail/poll ───────────────────────────────────────
// Manually trigger a poll cycle (useful for testing / force refresh)
router.post("/gmail/poll", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.body.userId as string) || "default";
    const newCount = await pollGmailInbox(userId);
    const alerts = await GmailAlert.find({ userId, isRead: false })
      .sort({ priorityScore: -1, receivedAt: -1 })
      .limit(3);
    res.json({ newCount, alerts });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/integrations/gmail/clear ────────────────────────────────────
router.delete("/gmail/clear", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || "default";
    await GmailAlert.deleteMany({ userId });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
