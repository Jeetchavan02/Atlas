import type { AtlasContext, ContextFreshness, ContextSnapshot, IContextSource, ContextInsight } from "./types.js";
import { detectInsights } from "./insightDetector.js";
import { TaskContextSource } from "./sources/TaskContextSource.js";
import { CalendarContextSource } from "./sources/CalendarContextSource.js";
import { HealthContextSource } from "./sources/HealthContextSource.js";
import { FitnessContextSource } from "./sources/FitnessContextSource.js";
import { HabitContextSource } from "./sources/HabitContextSource.js";
import { MemoryContextSource } from "./sources/MemoryContextSource.js";
import { GoalContextSource } from "./sources/GoalContextSource.js";
import { ConstraintContextSource } from "./sources/ConstraintContextSource.js";

class ContextEngineImpl {
  private sources: Map<string, IContextSource> = new Map();

  constructor() {
    this.registerSource(new TaskContextSource());
    this.registerSource(new CalendarContextSource());
    this.registerSource(new HealthContextSource());
    this.registerSource(new FitnessContextSource());
    this.registerSource(new HabitContextSource());
    this.registerSource(new MemoryContextSource());
    this.registerSource(new GoalContextSource());
    this.registerSource(new ConstraintContextSource());
  }

  /**
   * Register a new ContextSource module
   */
  registerSource(source: IContextSource) {
    this.sources.set(source.id, source);
  }

  /**
   * Get a specific ContextSource by ID
   */
  getSource(id: string): any {
    return this.sources.get(id);
  }

  /**
   * Build a holistic snapshot of the user's current context
   */
  async buildSnapshot(intent: string | null): Promise<ContextSnapshot> {
    const context: AtlasContext = {
      time: new Date().toLocaleTimeString("en-US", { hour12: false }),
      date: new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };

    const freshness: Record<string, ContextFreshness> = {};
    const insightPromises: Promise<void>[] = [];

    // Determine which sources are relevant based on intent
    const activeSourceIds = new Set<string>();
    
    if (!intent) {
      // Dashboard view: all sources
      for (const id of this.sources.keys()) activeSourceIds.add(id);
    } else {
      const lowerIntent = intent.toLowerCase().trim();
      const casualRegex = /^(hi|hello|hey|good morning|good evening|how are you|tell me a joke|thanks|thank you|nice|what are you doing|what's up|sup)[\s\?\!\.]*$/i;
      const isCasual = casualRegex.test(lowerIntent);

      if (isCasual) {
        // Casual conversation: only load memory for core personal facts
        activeSourceIds.add("memory");
      } else {
        // Always include constraints and memory for non-casual requests
        activeSourceIds.add("constraints");
        activeSourceIds.add("memory");
        
        const isBroad = lowerIntent.includes("what matters") || 
                        lowerIntent.includes("important") || 
                        lowerIntent.includes("plan my") ||
                        lowerIntent.includes("everything") ||
                        lowerIntent.includes("overview");
        
        if (isBroad) {
          for (const id of this.sources.keys()) activeSourceIds.add(id);
        } else {
          // Keyword-based routing for contextual requests
          if (lowerIntent.includes("today") || lowerIntent.includes("tonight") || lowerIntent.includes("schedule") || lowerIntent.includes("calendar") || lowerIntent.includes("event") || lowerIntent.includes("meeting") || lowerIntent.includes("time")) {
            activeSourceIds.add("calendar");
          }
          
          if (lowerIntent.includes("train") || lowerIntent.includes("workout") || lowerIntent.includes("gym") || lowerIntent.includes("health") || lowerIntent.includes("recovery") || lowerIntent.includes("sleep") || lowerIntent.includes("score") || lowerIntent.includes("heart")) {
            activeSourceIds.add("health");
            activeSourceIds.add("fitness");
          }
          
          if (lowerIntent.includes("task") || lowerIntent.includes("work") || lowerIntent.includes("do") || lowerIntent.includes("priority") || lowerIntent.includes("finish") || lowerIntent.includes("pending")) {
            activeSourceIds.add("tasks");
            activeSourceIds.add("goals");
          }
          
          if (lowerIntent.includes("habit")) {
            activeSourceIds.add("habits");
          }

          // If no specific keyword hits, we don't dump everything. We just use memory/constraints,
          // allowing normal LLM conversation without context leak.
        }
      }
    }

    // Query relevant sources in parallel
    const fetches = Array.from(this.sources.values()).map(async (source) => {
      if (!activeSourceIds.has(source.id)) {
         return; // filtered out
      }
      
      try {
        const data = await source.getContext(intent);
        if (data !== null) {
          (context as any)[source.id] = data;
        }
        freshness[source.id] = source.getFreshness();
      } catch (err) {
        console.error(`[ContextEngine] Failed to load source ${source.id}:`, err);
        freshness[source.id] = "UNAVAILABLE";
      }
    });

    await Promise.all(fetches);

    // Evaluate Insights (Conflicts, Risks, Opportunities)
    const insights: ContextInsight[] = detectInsights(context);

    return {
      timestamp: new Date(),
      intent,
      context,
      insights,
      freshness,
    };
  }
}

export const ContextEngine = new ContextEngineImpl();
