import type { IContextSource, ContextFreshness } from "../types.js";
import CalendarEvent from "../../../models/CalendarEvent.js";

export class CalendarContextSource implements IContextSource {
  id = "calendar";
  name = "Calendar Manager";
  
  private lastUpdate = new Date();

  public markUpdated() {
    this.lastUpdate = new Date();
  }

  async getContext(intent: string | null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setDate(endOfToday.getDate() + 1);

    // Fetch events for today
    const events = await CalendarEvent.find({
      date: { $gte: today, $lt: endOfToday }
    }).sort({ startHour: 1 }).select("title startHour endHour category");

    const currentHour = new Date().getHours();
    
    // Find what is happening right now
    const activeEvent = events.find(e => currentHour >= e.startHour && currentHour < e.endHour);
    
    // Find next event
    const upcomingEvents = events.filter(e => e.startHour > currentHour);

    return {
      activeEvent: activeEvent ? {
        id: activeEvent._id,
        title: activeEvent.title,
        time: `${activeEvent.startHour}:00 - ${activeEvent.endHour}:00`,
        category: activeEvent.category
      } : null,
      upcomingEvents: upcomingEvents.map(e => ({
        id: e._id,
        title: e.title,
        time: `${e.startHour}:00 - ${e.endHour}:00`,
        category: e.category
      }))
    };
  }

  getFreshness(): ContextFreshness {
    const diffMin = (Date.now() - this.lastUpdate.getTime()) / 60000;
    if (diffMin < 15) return "LIVE";
    if (diffMin < 120) return "RECENT";
    return "STALE";
  }
}
