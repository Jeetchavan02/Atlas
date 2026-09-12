import type { IContextSource, ContextFreshness } from "../types.js";
import Constraint from "../../../models/Constraint.js";

export class ConstraintContextSource implements IContextSource {
  id = "constraints";
  name = "Constraint Engine";
  
  private lastUpdate = new Date();

  public markUpdated() {
    this.lastUpdate = new Date();
  }

  async getContext(intent: string | null) {
    const today = new Date();
    const currentHour = today.getHours();
    const currentDay = today.getDay();

    // Only fetch ACTIVE constraints
    const constraints = await Constraint.find({ userId: "default", isActive: true });

    // Filter to constraints that apply right now based on timeframe
    const applicable = constraints.filter(c => {
      if (!c.timeframe) return true; // applies always
      
      const { startHour, endHour, daysOfWeek } = c.timeframe;
      
      if (daysOfWeek && daysOfWeek.length > 0 && !daysOfWeek.includes(currentDay)) {
        return false;
      }
      
      if (startHour !== undefined && endHour !== undefined) {
        if (startHour <= endHour) {
          // e.g. 9 to 17
          if (currentHour < startHour || currentHour >= endHour) return false;
        } else {
          // e.g. 22 to 6 (overnight)
          if (currentHour < startHour && currentHour >= endHour) return false;
        }
      }
      
      return true;
    });

    if (applicable.length === 0) return null;

    return {
      active: applicable.map(c => ({
        name: c.name,
        type: c.type,
        description: c.description
      }))
    };
  }

  getFreshness(): ContextFreshness {
    return "LIVE";
  }
}
