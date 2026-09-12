import { Router, type Request, type Response } from "express";
import { eventBus, type AtlasEvent } from "../services/eventBus.js";

const router = Router();

// ─── GET /api/stream ──────────────────────────────────────────────────────────
// Server-Sent Events (SSE) endpoint for realtime OS state updates
router.get("/", (req: Request, res: Response) => {
  // Set headers for SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  // Send an initial heartbeat
  res.write(`data: ${JSON.stringify({ type: "CONNECTION_ESTABLISHED" })}\n\n`);

  // Define the listener
  const listener = (event: AtlasEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Subscribe to all OS events
  eventBus.on("*", listener);

  // Keep connection alive with heartbeats every 30s
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "PING", timestamp: new Date() })}\n\n`);
  }, 30000);

  // Cleanup on client disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    eventBus.off("*", listener);
  });
});

export default router;
