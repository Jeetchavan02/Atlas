import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import habitRoutes from "./routes/habits.js";
import focusRoutes from "./routes/focus.js";
import taskRoutes from "./routes/tasks.js";
import gymRoutes from "./routes/gym.js";
import healthRoutes from "./routes/health.js";
import calendarRoutes from "./routes/calendar.js";
import aiRoutes from "./routes/ai.js";
import integrationsRoutes from "./routes/integrations.js";
import zeppSyncRoutes from "./routes/zeppSync.js";
import { startGmailPoller } from "./services/gmailPoller.js";
import { startZeppMockPoller } from "./services/zeppMockPoller.js";
import syncRoutes from "./routes/sync.js";

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000",
  "http://localhost:8080",
  "https://*.lovable.app",
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (
        !origin ||
        allowedOrigins.some((o) => {
          if (o.includes("*")) {
            const pattern = o.replace(/\*/g, ".");
            return origin.includes(pattern.replace(/^\./, ""));
          }
          return origin === o;
        })
      ) {
        cb(null, true);
      } else {
        cb(null, true);
      }
    },
    credentials: true,
  }),
);
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/ping", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ─── Core routes ─────────────────────────────────────────────────────────────
app.use("/api/habits", habitRoutes);
app.use("/api/focus", focusRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/gym", gymRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api", aiRoutes); // /api/chat, /api/conversations, /api/models

// ─── Integration routes ───────────────────────────────────────────────────────
app.use("/api/integrations/gmail", integrationsRoutes);
app.use("/api/integrations/zepp", zeppSyncRoutes);
app.use("/api/sync", syncRoutes);

// ─── Error handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);

async function start() {
  await connectDB();

  // Start background services
  const gmailInterval = parseInt(process.env.GMAIL_POLL_INTERVAL_MS ?? "300000", 10);
  startGmailPoller(gmailInterval);

  const zeppInterval = parseInt(process.env.ZEPP_SYNC_INTERVAL_MS ?? "900000", 10);
  startZeppMockPoller(zeppInterval);

  app.listen(PORT, () => {
    console.log(`[server] Atlas API running on http://localhost:${PORT}`);
    console.log(`[server] Gmail poller: every ${gmailInterval / 60000}min`);
    console.log(
      `[server] Zepp mock: ${process.env.ZEPP_MOCK_ENABLED === "true" ? `every ${zeppInterval / 60000}min` : "disabled"}`,
    );
  });
}

start();
