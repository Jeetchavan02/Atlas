import type { IContextSource, ContextFreshness } from "../types.js";
import GymSession from "../../../models/GymSession.js";

export class FitnessContextSource implements IContextSource {
  id = "fitness";
  name = "Fitness & Training";
  
  private lastUpdate = new Date();

  public markUpdated() {
    this.lastUpdate = new Date();
  }

  async getContext(intent: string | null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setDate(endOfToday.getDate() + 1);

    // Any gym session logged today?
    const sessions = await GymSession.find({
      date: { $gte: today, $lt: endOfToday }
    }).select("name duration strain");

    // Get last 3 days to determine if we are overtraining
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const recentSessions = await GymSession.find({
      date: { $gte: threeDaysAgo, $lt: endOfToday }
    }).select("name date");

    const diffMin = (Date.now() - this.lastUpdate.getTime()) / 60000;
    const dataState = diffMin > 360 ? "STALE" : "LIVE";

    return {
      dataState,
      trainedToday: sessions.length > 0,
      todaySessions: sessions.map(s => ({
        name: s.name,
        duration: s.duration,
        strain: s.strain
      })),
      consecutiveDaysTrained: recentSessions.length // simple heuristic
    };
  }

  getFreshness(): ContextFreshness {
    const diffMin = (Date.now() - this.lastUpdate.getTime()) / 60000;
    if (diffMin < 30) return "LIVE";
    if (diffMin < 360) return "RECENT";
    return "STALE";
  }
}
