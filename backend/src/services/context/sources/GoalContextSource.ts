import type { IContextSource, ContextFreshness } from "../types.js";
import Goal from "../../../models/Goal.js";

export class GoalContextSource implements IContextSource {
  id = "goals";
  name = "Goal Engine";
  
  private lastUpdate = new Date();

  public markUpdated() {
    this.lastUpdate = new Date();
  }

  async getContext(intent: string | null) {
    const activeGoals = await Goal.find({ userId: "default", status: "ACTIVE" })
      .sort({ priority: -1 })
      .select("title priority deadline progress");
      
    if (activeGoals.length === 0) return null;

    return {
      active: activeGoals.map(g => ({
        title: g.title,
        priority: g.priority,
        deadline: g.deadline,
        progress: g.progress
      }))
    };
  }

  getFreshness(): ContextFreshness {
    const diffMin = (Date.now() - this.lastUpdate.getTime()) / 60000;
    if (diffMin < 60) return "LIVE";
    if (diffMin < 240) return "RECENT";
    return "STALE";
  }
}
