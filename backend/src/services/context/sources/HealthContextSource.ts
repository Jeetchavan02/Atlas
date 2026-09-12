import type { IContextSource, ContextFreshness } from "../types.js";
import HealthMetric from "../../../models/HealthMetric.js";

export class HealthContextSource implements IContextSource {
  id = "health";
  name = "Health & Recovery";
  
  private lastUpdate = new Date();

  public markUpdated() {
    this.lastUpdate = new Date();
  }

  async getContext(intent: string | null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const health = await HealthMetric.findOne({ date: today }).select(
      "recoveryScore sleepHours sleepScore restingHeartRate hrv liveHeartRate activeSessions"
    );

    if (!health) {
      return { dataState: "UNAVAILABLE" };
    }

    const diffMin = (Date.now() - this.lastUpdate.getTime()) / 60000;
    const dataState = diffMin > 120 ? "STALE" : "LIVE";

    return {
      dataState,
      recoveryScore: health.recoveryScore ?? null,
      sleep: {
        hours: health.sleepHours ?? null,
        score: health.sleepScore ?? null
      },
      vitals: {
        rhr: health.restingHeartRate ?? null,
        hrv: health.hrv ?? null,
        liveHR: health.liveHeartRate ?? null
      },
      hasTrainedToday: health.activeSessions && health.activeSessions.length > 0
    };
  }

  getFreshness(): ContextFreshness {
    const diffMin = (Date.now() - this.lastUpdate.getTime()) / 60000;
    if (diffMin < 15) return "LIVE";
    if (diffMin < 120) return "RECENT";
    return "STALE";
  }
}
