export type ContextFreshness = "LIVE" | "RECENT" | "STALE" | "UNAVAILABLE";

export type InsightType = "CONFLICT" | "RISK" | "OPPORTUNITY" | "CONSTRAINT_VIOLATION" | "RECOMMENDATION";

export interface ContextInsight {
  type: InsightType;
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
  sourceEntities: string[]; // e.g. ["Task:6aa...", "CalendarEvent:6ab..."]
}

export interface IContextSource<T = any> {
  id: string;
  name: string;
  
  /**
   * Retrieves relevant context based on the user's intent or current state.
   * If intent is null, should return the default "dashboard" state.
   */
  getContext(intent: string | null): Promise<T | null>;
  
  /**
   * Describes how fresh the data is.
   */
  getFreshness(): ContextFreshness;
}

export interface AtlasContext {
  // Time state
  time: string;
  date: string;
  
  // High-level snapshot of domains
  tasks?: any;
  calendar?: any;
  health?: any;
  fitness?: any;
  habits?: any;
  goals?: any;
  constraints?: any;
  memory?: any;
}

export interface ContextSnapshot {
  timestamp: Date;
  intent: string | null;
  context: AtlasContext;
  insights: ContextInsight[];
  freshness: Record<string, ContextFreshness>;
}
