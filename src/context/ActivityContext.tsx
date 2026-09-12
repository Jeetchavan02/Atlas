import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

// ── Types ────────────────────────────────────────────────────────
export type ActivityCategory =
  | "SYSTEM"
  | "HEALTH"
  | "TASK"
  | "CALENDAR"
  | "FITNESS"
  | "AI"
  | "INTEGRATION";

export type ActivitySeverity = "info" | "warning" | "success" | "error";

export interface Activity {
  id: string;
  timestamp: Date;
  category: ActivityCategory;
  title: string;
  description?: string;
  severity: ActivitySeverity;
}

interface ActivityContextType {
  activities: Activity[];
  unreadCount: number;
  addActivity: (a: Omit<Activity, "id" | "timestamp">) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const ActivityContext = createContext<ActivityContextType | null>(null);

// ── Seed data — representative system events ─────────────────────
// These are initial seeded events. Replace with real event bus events in future phases.
const seedActivities: Activity[] = [
  {
    id: "seed-1",
    timestamp: new Date(Date.now() - 1000 * 60 * 3),
    category: "INTEGRATION",
    title: "Zepp sync complete",
    description: "Amazfit Bip 6 — sleep, HR, steps updated",
    severity: "success",
  },
  {
    id: "seed-2",
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
    category: "HEALTH",
    title: "Recovery updated",
    description: "Recovery score recalculated from last night's sleep",
    severity: "info",
  },
  {
    id: "seed-3",
    timestamp: new Date(Date.now() - 1000 * 60 * 28),
    category: "TASK",
    title: "Task overdue",
    description: "Review presentation — was due earlier today",
    severity: "warning",
  },
  {
    id: "seed-4",
    timestamp: new Date(Date.now() - 1000 * 60 * 44),
    category: "AI",
    title: "Daily briefing generated",
    description: "Atlas synthesized your morning context",
    severity: "info",
  },
  {
    id: "seed-5",
    timestamp: new Date(Date.now() - 1000 * 60 * 61),
    category: "FITNESS",
    title: "Workout logged",
    description: "Push Day — 60 min, 5 exercises",
    severity: "success",
  },
];

// ── Provider ─────────────────────────────────────────────────────
export function ActivityProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>(seedActivities);
  const [readCount, setReadCount] = useState(0);

  const addActivity = useCallback(
    (a: Omit<Activity, "id" | "timestamp">) => {
      const newActivity: Activity = {
        ...a,
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: new Date(),
      };
      setActivities((prev) => [newActivity, ...prev].slice(0, 50)); // keep last 50
    },
    [],
  );

  useEffect(() => {
    const sse = new EventSource("http://localhost:4000/api/stream");
    
    sse.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "CONNECTION_ESTABLISHED" || event.type === "PING") return;
        
        // Translate OS event to UI Activity
        let category: ActivityCategory = "SYSTEM";
        if (event.type.includes("TASK")) category = "TASK";
        if (event.type.includes("HEALTH")) category = "HEALTH";
        if (event.type.includes("MEMORY")) category = "AI";
        if (event.type.includes("AUTOMATION")) category = "INTEGRATION";
        
        setActivities((prev) => {
          const newActivity: Activity = {
            id: event.id || `act-${Date.now()}`,
            timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
            category,
            title: event.type.replace(/_/g, " "),
            description: event.source ? `Triggered by ${event.source}` : undefined,
            severity: "info",
          };
          return [newActivity, ...prev].slice(0, 50);
        });
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    return () => sse.close();
  }, []);

  const markAllRead = useCallback(() => {
    setReadCount(activities.length);
  }, [activities.length]);

  const clearAll = useCallback(() => {
    setActivities([]);
    setReadCount(0);
  }, []);

  const unreadCount = Math.max(0, activities.length - readCount);

  return (
    <ActivityContext.Provider
      value={{ activities, unreadCount, addActivity, markAllRead, clearAll }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────
export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error("useActivity must be inside <ActivityProvider>");
  return ctx;
}

// ── Utilities ────────────────────────────────────────────────────
export function formatActivityTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export const categoryColors: Record<ActivityCategory, string> = {
  SYSTEM:      "oklch(0.65 0.03 270)",
  HEALTH:      "var(--color-iris)",
  TASK:        "var(--color-amber-glow)",
  CALENDAR:    "var(--color-cyan-glow)",
  FITNESS:     "var(--color-mint)",
  AI:          "var(--color-iris)",
  INTEGRATION: "var(--color-cyan-glow)",
};
