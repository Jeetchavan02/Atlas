import type { IContextSource, ContextFreshness } from "../types.js";
import Task from "../../../models/Task.js";

export class TaskContextSource implements IContextSource {
  id = "tasks";
  name = "Task Manager";

  private lastUpdate = new Date();

  // EventBus hook could call this
  public markUpdated() {
    this.lastUpdate = new Date();
  }

  async getContext(intent: string | null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setDate(endOfToday.getDate() + 1);

    // Fetch high priority, overdue, or due today tasks
    const relevantTasks = await Task.find({
      done: false,
      $or: [
        { priority: "high" },
        { dueDate: { $lte: endOfToday } },
      ]
    })
    .sort({ priority: -1, dueDate: 1 })
    .limit(10)
    .select("title priority dueDate category project");

    // Count overall backlog
    const totalPending = await Task.countDocuments({ done: false });

    return {
      totalPending,
      criticalTasks: relevantTasks.map(t => ({
        id: t._id,
        title: t.title,
        priority: t.priority,
        due: t.dueDate,
        project: t.project
      }))
    };
  }

  getFreshness(): ContextFreshness {
    const diffMin = (Date.now() - this.lastUpdate.getTime()) / 60000;
    if (diffMin < 5) return "LIVE";
    if (diffMin < 60) return "RECENT";
    return "STALE";
  }
}
