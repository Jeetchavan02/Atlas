import type { IContextSource, ContextFreshness } from "../types.js";
import Habit from "../../../models/Habit.js";

export class HabitContextSource implements IContextSource {
  id = "habits";
  name = "Habit Tracker";
  
  private lastUpdate = new Date();

  public markUpdated() {
    this.lastUpdate = new Date();
  }

  async getContext(intent: string | null) {
    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch active habits
    const habits = await Habit.find({ archived: false }).select("name currentStreak completedDates");

    // Filter to those not completed today
    const incompleteHabits = habits.filter(h => {
      const anyH = h as any;
      if (!anyH.completedDates) return true;
      const lastCompleted = anyH.completedDates[anyH.completedDates.length - 1];
      if (!lastCompleted) return true;
      const lastStr = new Date(lastCompleted).toISOString().split('T')[0];
      return lastStr !== todayStr;
    });

    if (incompleteHabits.length === 0) return null;

    return {
      incomplete: incompleteHabits.map(h => ({
        name: h.name,
        streak: h.currentStreak
      }))
    };
  }

  getFreshness(): ContextFreshness {
    return "LIVE"; // Habits are usually calculated live on demand
  }
}
